"""
Export daily underlying price + options activity for 8 tickers.
Output: /public/assets/data/daily_activity_8tickers.json
"""

import os
import json
from pathlib import Path
from decimal import Decimal
import snowflake.connector
from cryptography.hazmat.primitives import serialization

# --- CONFIGURATION ---
# TODO: Update these placeholders with your actual new tickers
TICKERS = ["AAPL", "AMZN", "GME", "GOOGL", "IWM", "MSFT", "NVDA", "QQQ", "SPY", "TSLA"]
START_DATE = "2025-09-01"
END_DATE = "2025-11-30"
OUTPUT_FILENAME = "daily_activity_8tickers.json"

# Snowflake Settings
SF_ACCOUNT = "OQCLMEX-MX55012"
SF_USER = "AIRFLOW_STOCKS_USER"
SF_ROLE = "STOCKS_ELT_ROLE"
SF_WAREHOUSE = "STOCKS_ELT_WH"
SF_DATABASE = "STOCKS_ELT_DB"
SF_SCHEMA = "RAW"
# ---------------------

def load_private_key():
    """
    Load unencrypted PKCS#8 private key and return DER-encoded bytes.
    Expects SNOWFLAKE_PRIVATE_KEY_PATH env var to point to the local .p8 file.
    """
    key_path = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH")
    if not key_path:
        raise ValueError("Please set SNOWFLAKE_PRIVATE_KEY_PATH environment variable.")
    
    with open(key_path, "rb") as f:
        # No password required
        p_key = serialization.load_pem_private_key(
            f.read(),
            password=None 
        )
    
    # Snowflake connector requires the key in DER format bytes
    pkb = p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    return pkb


def get_conn():
    conn = snowflake.connector.connect(
        account=SF_ACCOUNT,
        user=SF_USER,
        role=SF_ROLE,
        warehouse=SF_WAREHOUSE,
        database=SF_DATABASE,
        schema=SF_SCHEMA,
        private_key=load_private_key(),
    )
    return conn


SQL_TEMPLATE = """
select
    trade_date,
    ticker,
    underlying_close_price,
    total_option_volume,
    volume_7d_avg
from STOCKS_ELT_DB.PREP.INT_MASSIVE__TICKER_VOLUME_DAILY
where ticker in ({ticker_list})
  and trade_date between date '{start_date}' and date '{end_date}'
order by ticker, trade_date
"""


def main():
    conn = get_conn()
    try:
        cur = conn.cursor()
        
        # Format list for SQL: 'AAPL','AMZN',...
        formatted_tickers = ", ".join(f"'{t}'" for t in TICKERS)
        
        sql = SQL_TEMPLATE.format(
            ticker_list=formatted_tickers, 
            start_date=START_DATE, 
            end_date=END_DATE
        )
        
        cur.execute(sql)
        cols = [c[0].lower() for c in cur.description]
        rows = []

        for row in cur.fetchall():
            rec = dict(zip(cols, row))
            if rec.get("trade_date") is not None:
                rec["trade_date"] = rec["trade_date"].isoformat()
            for k, v in rec.items():
                if isinstance(v, Decimal):
                    rec[k] = float(v)
            rows.append(rec)
    finally:
        conn.close()

    assets_dir = Path(__file__).resolve().parents[1]
    data_dir = assets_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    out_path = data_dir / OUTPUT_FILENAME

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == "__main__":
    main()

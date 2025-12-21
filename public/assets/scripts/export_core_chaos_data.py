"""
Export Core & Chaos Data
------------------------
Orchestrates the extraction of dashboard-ready JSON datasets from Snowflake.

Datasets Exported:
1. Mag 7 Momentum (Time Series): Bull/Bear signal flows for the big 7.
2. Macro Gravity (Time Series): PCR & Correlation regimes for market engines.
3. Top Contracts (Widget): The top 25 most active options for all 15 tickers.

Source: Snowflake (STOCKS_ELT_DB.PREP)
Destination: Local /data folder (ready for S3 upload)
"""

import os
import json
from pathlib import Path
from decimal import Decimal
import snowflake.connector
from cryptography.hazmat.primitives import serialization

# --- CONFIGURATION ---
# The "Perfect 15"
TICKERS_MAG7 = ["AAPL", "AMZN", "GOOGL", "META", "MSFT", "NVDA", "TSLA"]
TICKERS_MACRO = ["IWM", "QQQ", "SPY", "TLT"]
TICKERS_CHAOS = ["GME", "IBIT", "RDDT", "VIX"]
ALL_TICKERS = TICKERS_MAG7 + TICKERS_MACRO + TICKERS_CHAOS

# Dashboard Window
START_DATE = '2025-06-30'
END_DATE = '2025-12-19'

# Snowflake Settings
SF_ACCOUNT = "OQCLMEX-MX55012"
SF_USER = "AIRFLOW_STOCKS_USER"
SF_ROLE = "STOCKS_ELT_ROLE"
SF_WAREHOUSE = "STOCKS_ELT_WH"
SF_DATABASE = "STOCKS_ELT_DB"
SF_SCHEMA = "PREP"
# ---------------------

def load_private_key():
    """Loads the PEM private key from the environment variable path."""
    key_path = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH")
    if not key_path:
        raise ValueError("Please set SNOWFLAKE_PRIVATE_KEY_PATH environment variable.")
    
    with open(key_path, "rb") as f:
        p_key = serialization.load_pem_private_key(f.read(), password=None)
    
    return p_key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )

def get_conn():
    """Establishes a secure connection to Snowflake."""
    return snowflake.connector.connect(
        account=SF_ACCOUNT,
        user=SF_USER,
        role=SF_ROLE,
        warehouse=SF_WAREHOUSE,
        database=SF_DATABASE,
        schema=SF_SCHEMA,
        private_key=load_private_key(),
    )

def run_query(conn, sql):
    """Executes SQL and returns a list of dictionaries with JSON-friendly types."""
    cur = conn.cursor()
    try:
        cur.execute(sql)
        cols = [c[0].lower() for c in cur.description]
        rows = []
        for row in cur.fetchall():
            rec = dict(zip(cols, row))
            # JSON Serialization Fixes
            for k, v in rec.items():
                if isinstance(v, Decimal):
                    rec[k] = float(v)
                elif hasattr(v, 'isoformat'):  # Dates/Timestamps
                    rec[k] = v.isoformat()
            rows.append(rec)
        return rows
    finally:
        cur.close()

def save_json(data, filename):
    """Writes the list of dicts to a JSON file in the ../data/ directory."""
    assets_dir = Path(__file__).resolve().parents[1]
    data_dir = assets_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    out_path = data_dir / filename

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"✅ Saved {filename} ({len(data)} records) to {out_path}")

# --- EXPORT ROUTINES ---

def export_mag7_momentum(conn):
    print("🚀 Fetching Mag 7 Momentum Data...")
    sql = f"""
        SELECT *
        FROM STOCKS_ELT_DB.PREP.INT_MASSIVE__STOCKS_OPTIONS_MAG7_MOMENTUM
        WHERE trade_date BETWEEN '{START_DATE}' AND '{END_DATE}'
        ORDER BY trade_date DESC, underlying_ticker ASC
    """
    rows = run_query(conn, sql)
    save_json(rows, "dashboard_mag7_momentum.json")

def export_macro_gravity(conn):
    print("⚖️ Fetching Macro Gravity Data...")
    sql = f"""
        SELECT *
        FROM STOCKS_ELT_DB.PREP.INT_MASSIVE__STOCKS_OPTIONS_MACRO_GRAVITY
        WHERE trade_date BETWEEN '{START_DATE}' AND '{END_DATE}'
        ORDER BY trade_date DESC, underlying_ticker ASC
    """
    rows = run_query(conn, sql)
    save_json(rows, "dashboard_macro_gravity.json")

def export_top_contracts(conn):
    print(f"🔥 Fetching Top Contracts for {len(ALL_TICKERS)} tickers...")
    tickers_sql = ",".join(f"'{t}'" for t in ALL_TICKERS)
    
    # Logic:
    # 1. Filter INT chain model to target tickers/dates.
    # 2. Sum volume by contract (option_symbol).
    # 3. Join back to get the *latest* price and moneyness for that contract.
    # 4. Rank top 25 by volume per ticker.
    
    sql = f"""
    with bounds as (
        select underlying_ticker, max(trade_date) as max_date 
        from STOCKS_ELT_DB.PREP.INT_MASSIVE__OPTIONS_CHAIN_DAILY
        where trade_date BETWEEN '{START_DATE}' AND '{END_DATE}'
          and underlying_ticker in ({tickers_sql})
        group by 1
    ),
    base as (
        select t.* from STOCKS_ELT_DB.PREP.INT_MASSIVE__OPTIONS_CHAIN_DAILY t
        where t.trade_date BETWEEN '{START_DATE}' AND '{END_DATE}'
          and t.underlying_ticker in ({tickers_sql})
    ),
    agg as (
        select 
            option_symbol, underlying_ticker, expiration_date, option_type, strike_price,
            sum(option_volume) as total_volume,
            avg(signed_moneyness_pct) as avg_moneyness
        from base
        group by 1, 2, 3, 4, 5
    ),
    latest as (
        select t.option_symbol, t.option_close_price, t.trade_date
        from base t
        join bounds b 
          on t.underlying_ticker = b.underlying_ticker 
          and t.trade_date = b.max_date
    )
    select 
        a.option_symbol, a.underlying_ticker, a.expiration_date, a.option_type, a.strike_price,
        a.total_volume,
        l.option_close_price as latest_close_price,
        a.avg_moneyness as signed_moneyness_pct
    from agg a
    join latest l on a.option_symbol = l.option_symbol
    qualify row_number() over (partition by a.underlying_ticker order by a.total_volume desc) <= 25
    order by a.underlying_ticker, a.total_volume desc
    """
    rows = run_query(conn, sql)
    save_json(rows, "dashboard_top_contracts.json")

def main():
    try:
        print("🔌 Connecting to Snowflake...")
        conn = get_conn()
        
        export_mag7_momentum(conn)
        export_macro_gravity(conn)
        export_top_contracts(conn)
        
        print("\n🎉 All exports complete. Data is ready for the frontend.")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()

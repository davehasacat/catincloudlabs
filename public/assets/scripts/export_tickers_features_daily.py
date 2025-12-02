"""
Export 3 (ticker feature grid) for catincloudlabs.com/projects.

Reads from STOCKS_ELT_DB.PREP.INT_POLYGON__TICKER_FEATURES_DAILY
for a fixed date window and a small set of tickers, then writes
ticker_features_daily_5tickers.json under public/assets/data.
"""

import os
import json
from pathlib import Path
from decimal import Decimal

import snowflake.connector
from cryptography.hazmat.primitives import serialization


TICKERS = ["AAPL", "AMZN", "GOOGL", "MSFT", "NVDA"]

# Fixed dev window for Export 3 (can be adjusted later)
START_DATE = "2025-09-02"
END_DATE = "2025-11-28"


def load_private_key():
    """
    Load the encrypted PKCS#8 private key from disk using the passphrase
    in SNOWFLAKE_PRIVATE_KEY_PASSPHRASE and return a key object that
    the Snowflake connector can use.
    """
    key_path = os.environ["SNOWFLAKE_PRIVATE_KEY_PATH"]
    passphrase = os.environ["SNOWFLAKE_PRIVATE_KEY_PASSPHRASE"].encode("utf-8")

    with open(key_path, "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=passphrase,
        )

    return private_key


def get_conn():
    private_key = load_private_key()

    conn = snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        role=os.environ["SNOWFLAKE_ROLE"],
        warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
        database=os.environ["SNOWFLAKE_DATABASE"],
        schema=os.environ["SNOWFLAKE_SCHEMA"],
        private_key=private_key,
    )
    return conn


SQL_TEMPLATE = """
select
    trade_date,
    underlying_ticker,
    underlying_close_price          as close_price,
    return_1d,
    return_5d,
    realized_vol_20d_annualized,
    underlying_volume,
    option_volume_total,
    option_volume_30d_avg,
    option_volume_vs_30d,
    call_put_ratio
from STOCKS_ELT_DB.PREP.INT_POLYGON__TICKER_FEATURES_DAILY
where underlying_ticker in ({tickers})
  and trade_date between '{start_date}' and '{end_date}'
order by trade_date, underlying_ticker
"""


def main():
    conn = get_conn()
    try:
        cur = conn.cursor()

        # Debug context
        cur.execute(
            "select current_role(), current_warehouse(), "
            "current_database(), current_schema()"
        )
        print("Context:", cur.fetchone())

        # Build IN (...) list for tickers
        tickers_sql = ",".join("'{}'".format(t) for t in TICKERS)

        sql = SQL_TEMPLATE.format(
            tickers=tickers_sql,
            start_date=START_DATE,
            end_date=END_DATE,
        )

        cur.execute(sql)
        cols = [c[0].lower() for c in cur.description]
        rows = []

        for row in cur.fetchall():
            rec = dict(zip(cols, row))

            # Convert DATE -> ISO strings
            if rec.get("trade_date") is not None:
                rec["trade_date"] = rec["trade_date"].isoformat()

            # Convert Decimal -> float
            for k, v in rec.items():
                if isinstance(v, Decimal):
                    rec[k] = float(v)

            rows.append(rec)
    finally:
        conn.close()

    assets_dir = Path(__file__).resolve().parents[1]  # .../public/assets
    data_dir = assets_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    out_path = data_dir / "ticker_features_daily_5tickers.json"

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == "__main__":
    main()

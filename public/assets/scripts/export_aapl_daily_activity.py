import os
import json
from pathlib import Path
from decimal import Decimal

import snowflake.connector
from cryptography.hazmat.primitives import serialization


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


SQL = """
select
    trade_date,
    ticker,
    underlying_close_price,
    total_option_volume,
    volume_7d_avg
from STOCKS_ELT_DB.PREP.INT_POLYGON__TICKER_DAILY_ACTIVITY
where ticker = 'AAPL'
  and trade_date >= dateadd(day, -90, current_date)
order by trade_date
"""


def main():
    conn = get_conn()
    try:
        cur = conn.cursor()

        # Optional: debug context so we know where we are
        cur.execute(
            "select current_role(), current_warehouse(), "
            "current_database(), current_schema()"
        )
        print("Context:", cur.fetchone())

        # Run the actual query
        cur.execute(SQL)
        cols = [c[0].lower() for c in cur.description]
        rows = []

        for row in cur.fetchall():
            rec = dict(zip(cols, row))

            # Convert DATE to ISO string for JSON
            if rec.get("trade_date") is not None:
                rec["trade_date"] = rec["trade_date"].isoformat()

            # Convert Decimal -> float so json can serialize it
            for k, v in rec.items():
                if isinstance(v, Decimal):
                    rec[k] = float(v)

            rows.append(rec)
    finally:
        conn.close()

    # . . . /public/assets/scripts/export_aapl_daily_activity.py
    # parents[1] => /public/assets
    assets_dir = Path(__file__).resolve().parents[1]
    data_dir = assets_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    out_path = data_dir / "aapl_daily_activity.json"

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == "__main__":
    main()

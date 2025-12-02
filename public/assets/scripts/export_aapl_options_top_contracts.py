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
with latest_trade_date as (
    select max(trade_date) as trade_date
    from STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY
    where underlying_ticker = 'AAPL'
),
filtered as (
    select
        t.option_symbol,
        t.underlying_ticker,
        t.trade_date,
        t.expiration_date,
        t.option_type,
        t.strike_price,
        t.option_close_price,
        t.option_volume,
        t.days_to_expiration,
        t.signed_moneyness_pct
    from STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY t
    join latest_trade_date d
      on t.trade_date = d.trade_date
    where t.underlying_ticker = 'AAPL'
      and t.days_to_expiration between 0 and 30      -- near-term
      and abs(t.signed_moneyness_pct) <= 0.15        -- near-the-money band
)
select
    option_symbol,
    underlying_ticker,
    trade_date,
    expiration_date,
    option_type,
    strike_price,
    option_close_price,
    option_volume,
    days_to_expiration,
    signed_moneyness_pct
from filtered
order by option_volume desc, expiration_date, strike_price
limit 15
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

        # Run the actual query
        cur.execute(SQL)
        cols = [c[0].lower() for c in cur.description]
        rows = []

        for row in cur.fetchall():
            rec = dict(zip(cols, row))

            # Convert DATEs to ISO strings
            for k in ("trade_date", "expiration_date"):
                if rec.get(k) is not None:
                    rec[k] = rec[k].isoformat()

            # Convert Decimal -> float so JSON can serialize it
            for k, v in rec.items():
                if isinstance(v, Decimal):
                    rec[k] = float(v)

            rows.append(rec)
    finally:
        conn.close()

    assets_dir = Path(__file__).resolve().parents[1]  # .../public/assets
    data_dir = assets_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    out_path = data_dir / "aapl_options_top_contracts.json"

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == "__main__":
    main()

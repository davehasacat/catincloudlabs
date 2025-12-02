import os
import json
from pathlib import Path
from decimal import Decimal

import snowflake.connector
from cryptography.hazmat.primitives import serialization


TICKERS = ["AAPL", "AMZN", "GOOGL", "MSFT", "NVDA"]


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
with bounds as (
    select
        underlying_ticker,
        max(trade_date) as max_trade_date,
        dateadd(day, -59, max(trade_date)) as min_trade_date
    from STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY
    where underlying_ticker in ({tickers})
    group by underlying_ticker
),
base as (
    select
        t.option_symbol,
        t.underlying_ticker,
        t.expiration_date,
        t.option_type,
        t.strike_price,
        t.option_close_price,
        t.option_volume,
        t.signed_moneyness_pct,
        t.trade_date,
        b.max_trade_date
    from STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY t
    join bounds b
      on t.underlying_ticker = b.underlying_ticker
     and t.trade_date between b.min_trade_date and b.max_trade_date
    where t.underlying_ticker in ({tickers})
),
agg as (
    select
        option_symbol,
        underlying_ticker,
        expiration_date,
        option_type,
        strike_price,
        sum(option_volume)           as total_volume,
        avg(signed_moneyness_pct)    as avg_signed_moneyness_pct,
        max(max_trade_date)          as max_trade_date
    from base
    group by
        option_symbol,
        underlying_ticker,
        expiration_date,
        option_type,
        strike_price
),
last_close as (
    select
        option_symbol,
        option_close_price as latest_close_price,
        trade_date,
        row_number() over (
            partition by option_symbol
            order by trade_date desc
        ) as rn
    from base
),
joined as (
    select
        a.option_symbol,
        a.underlying_ticker,
        a.expiration_date,
        a.option_type,
        a.strike_price,
        lc.latest_close_price,
        a.total_volume,
        datediff('day', a.max_trade_date, a.expiration_date) as days_to_expiration,
        a.avg_signed_moneyness_pct as signed_moneyness_pct
    from agg a
    join last_close lc
      on lc.option_symbol = a.option_symbol
     and lc.rn = 1
),
ranked as (
    select
        option_symbol,
        underlying_ticker,
        expiration_date,
        option_type,
        strike_price,
        latest_close_price,
        total_volume,
        days_to_expiration,
        signed_moneyness_pct,
        row_number() over (
            partition by underlying_ticker
            order by total_volume desc, expiration_date, strike_price
        ) as rn
    from joined
)
select
    option_symbol,
    underlying_ticker,
    expiration_date,
    option_type,
    strike_price,
    latest_close_price,
    total_volume,
    days_to_expiration,
    signed_moneyness_pct
from ranked
where rn <= 25
order by underlying_ticker, total_volume desc, expiration_date, strike_price
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

        # Build IN (...) list
        tickers_sql = ",".join("'{}'".format(t) for t in TICKERS)
        sql = SQL_TEMPLATE.format(tickers=tickers_sql)

        # Run the actual query
        cur.execute(sql)
        cols = [c[0].lower() for c in cur.description]
        rows = []

        for row in cur.fetchall():
            rec = dict(zip(cols, row))

            # Convert DATE -> ISO strings
            if rec.get("expiration_date") is not None:
                rec["expiration_date"] = rec["expiration_date"].isoformat()

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

    out_path = data_dir / "options_top_contracts_5tickers.json"

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)

    print(f"Wrote {len(rows)} rows to {out_path}")


if __name__ == "__main__":
    main()

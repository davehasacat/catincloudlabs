"""
Export 2 (options chain top contracts) for 8 tickers.
Output: /public/assets/data/options_top_contracts_8tickers.json
"""

import os
import json
from pathlib import Path
from decimal import Decimal
import snowflake.connector
from cryptography.hazmat.primitives import serialization

# --- CONFIGURATION ---
# TODO: Update these placeholders with your actual new tickers
TICKERS = ["AAPL", "AMZN", "GME", "GOOGL", "MSFT", "NVDA", "QQQ", "SPY"]
OUTPUT_FILENAME = "options_top_contracts_8tickers.json"

# Snowflake Settings
SF_ACCOUNT = "OQCLMEX-MX55012"
SF_USER = "AIRFLOW_STOCKS_USER"
SF_ROLE = "STOCKS_ELT_ROLE"
SF_WAREHOUSE = "STOCKS_ELT_WH"
SF_DATABASE = "STOCKS_ELT_DB"
SF_SCHEMA = "RAW"
# ---------------------

def load_private_key():
    key_path = os.environ.get("SNOWFLAKE_PRIVATE_KEY_PATH")
    if not key_path:
        raise ValueError("Please set SNOWFLAKE_PRIVATE_KEY_PATH environment variable.")
    
    with open(key_path, "rb") as f:
        p_key = serialization.load_pem_private_key(f.read(), password=None)
    
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

# (SQL_TEMPLATE remains the same as previously discussed)
SQL_TEMPLATE = """
with bounds as (
    select
        underlying_ticker,
        max(trade_date) as max_trade_date,
        dateadd(day, -59, max(trade_date)) as min_trade_date
    from STOCKS_ELT_DB.PREP.INT_MASSIVE__OPTIONS_CHAIN_DAILY
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
    from STOCKS_ELT_DB.PREP.INT_MASSIVE__OPTIONS_CHAIN_DAILY t
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
        sum(option_volume)        as total_volume,
        avg(signed_moneyness_pct) as avg_signed_moneyness_pct,
        max(max_trade_date)       as max_trade_date
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
        *,
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
        tickers_sql = ",".join("'{}'".format(t) for t in TICKERS)
        sql = SQL_TEMPLATE.format(tickers=tickers_sql)
        cur.execute(sql)
        cols = [c[0].lower() for c in cur.description]
        rows = []
        for row in cur.fetchall():
            rec = dict(zip(cols, row))
            if rec.get("expiration_date") is not None:
                rec["expiration_date"] = rec["expiration_date"].isoformat()
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

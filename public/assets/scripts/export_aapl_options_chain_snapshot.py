import os
import csv
from pathlib import Path

import snowflake.connector


def get_snowflake_connection():
    """
    Build a Snowflake connection using environment variables.

    Expected env vars:
      - SNOWFLAKE_ACCOUNT
      - SNOWFLAKE_USER
      - SNOWFLAKE_ROLE
      - SNOWFLAKE_WAREHOUSE
      - SNOWFLAKE_DATABASE
      - SNOWFLAKE_SCHEMA
      - SNOWFLAKE_PRIVATE_KEY_PATH
      - SNOWFLAKE_PRIVATE_KEY_PASSPHRASE
    """
    ctx = snowflake.connector.connect(
        account=os.environ["SNOWFLAKE_ACCOUNT"],
        user=os.environ["SNOWFLAKE_USER"],
        role=os.environ["SNOWFLAKE_ROLE"],
        warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
        database=os.environ["SNOWFLAKE_DATABASE"],
        schema=os.environ["SNOWFLAKE_SCHEMA"],
        private_key_file=os.environ["SNOWFLAKE_PRIVATE_KEY_PATH"],
        # IMPORTANT: this is the correct parameter name
        private_key_file_pwd=os.environ["SNOWFLAKE_PRIVATE_KEY_PASSPHRASE"],
    )
    return ctx


def fetch_aapl_options_chain_snapshot(cur):
    """
    Pull a single-day AAPL options chain snapshot from:
      STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY

    - Finds the latest trade_date for underlying_ticker = 'AAPL'
    - Returns all per-contract rows for that date.
    """

    query = """
        with latest_date as (
            select max(trade_date) as trade_date
            from STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY
            where underlying_ticker = 'AAPL'
        )
        select
            option_symbol,
            underlying_ticker,
            trade_date,
            expiration_date,
            option_type,
            strike_price,
            option_open_price,
            option_high_price,
            option_low_price,
            option_close_price,
            option_vwap,
            option_volume,
            option_trades,
            underlying_open_price,
            underlying_high_price,
            underlying_low_price,
            underlying_close_price,
            underlying_vwap,
            underlying_volume,
            underlying_trades,
            days_to_expiration,
            signed_moneyness_raw,
            signed_moneyness_pct,
            option_aggregates_timestamp,
            underlying_aggregates_timestamp,
            option_inserted_at,
            underlying_inserted_at,
            option_load_date,
            underlying_load_date,
            option_filename,
            underlying_filename,
            missing_underlying_flag
        from STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY c
        join latest_date d
          on c.trade_date = d.trade_date
        where c.underlying_ticker = 'AAPL'
        order by
            expiration_date,
            option_type desc,
            strike_price
    """

    cur.execute(query)
    rows = cur.fetchall()
    colnames = [desc[0] for desc in cur.description]
    return colnames, rows


def write_csv(colnames, rows, out_path: Path):
    """
    Write rows to CSV at out_path, creating the parent directory if needed.
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)

    with out_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(colnames)
        for row in rows:
            writer.writerow(row)


def main():
    # Resolve to: public/assets/data/aapl_options_chain_snapshot.csv
    base_dir = Path(__file__).resolve().parents[1]  # -> public/assets
    data_dir = base_dir / "data"
    out_path = data_dir / "aapl_options_chain_snapshot.csv"

    # Print context from env vars (matches README style)
    context = (
        os.environ.get("SNOWFLAKE_ROLE", "<missing>"),
        os.environ.get("SNOWFLAKE_WAREHOUSE", "<missing>"),
        os.environ.get("SNOWFLAKE_DATABASE", "<missing>"),
        os.environ.get("SNOWFLAKE_SCHEMA", "<missing>"),
    )
    print("Context:", context)

    ctx = get_snowflake_connection()

    try:
        cur = ctx.cursor()
        colnames, rows = fetch_aapl_options_chain_snapshot(cur)
        write_csv(colnames, rows, out_path)

        print(f"Wrote {len(rows)} rows to {out_path}")
    finally:
        try:
            cur.close()
        except Exception:
            pass
        ctx.close()


if __name__ == "__main__":
    main()

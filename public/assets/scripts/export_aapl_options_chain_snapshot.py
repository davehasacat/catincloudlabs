import os
import csv
import json
from pathlib import Path
from decimal import Decimal

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
            c.option_symbol,
            c.underlying_ticker,
            c.trade_date,
            c.expiration_date,
            c.option_type,
            c.strike_price,
            c.option_open_price,
            c.option_high_price,
            c.option_low_price,
            c.option_close_price,
            c.option_vwap,
            c.option_volume,
            c.option_trades,
            c.underlying_open_price,
            c.underlying_high_price,
            c.underlying_low_price,
            c.underlying_close_price,
            c.underlying_vwap,
            c.underlying_volume,
            c.underlying_trades,
            c.days_to_expiration,
            c.signed_moneyness_raw,
            c.signed_moneyness_pct,
            c.option_aggregates_timestamp,
            c.underlying_aggregates_timestamp,
            c.option_inserted_at,
            c.underlying_inserted_at,
            c.option_load_date,
            c.underlying_load_date,
            c.option_filename,
            c.underlying_filename,
            c.missing_underlying_flag
        from STOCKS_ELT_DB.PREP.INT_POLYGON__OPTIONS_CHAIN_DAILY c
        join latest_date d
          on c.trade_date = d.trade_date
        where c.underlying_ticker = 'AAPL'
        order by
            c.expiration_date,
            c.option_type desc,
            c.strike_price
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


def coerce_value(v):
    """
    Convert Snowflake/DB types into JSON-safe types.
    """
    if isinstance(v, Decimal):
        return float(v)
    # Dates / timestamps will have isoformat() in most Python DB types
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return v


def write_json(colnames, rows, out_path: Path):
    """
    Write rows to JSON as a list of records (dicts).
    """
    out_path.parent.mkdir(parents=True, exist_ok=True)

    records = []
    for row in rows:
        rec = {colnames[i].lower(): coerce_value(row[i]) for i in range(len(colnames))}
        records.append(rec)

    with out_path.open("w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    return len(records)


def main():
    # Base: public/assets
    base_dir = Path(__file__).resolve().parents[1]
    data_dir = base_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    csv_path = data_dir / "aapl_options_chain_snapshot.csv"
    json_path = data_dir / "aapl_options_chain_snapshot.json"

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

        # CSV for raw download / inspection
        write_csv(colnames, rows, csv_path)
        print(f"Wrote {len(rows)} rows to {csv_path}")

        # JSON for Plotly dashboard
        n_json = write_json(colnames, rows, json_path)
        print(f"Wrote {n_json} records to {json_path}")
    finally:
        try:
            cur.close()
        except Exception:
            pass
        ctx.close()


if __name__ == "__main__":
    main()

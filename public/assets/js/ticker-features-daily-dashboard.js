// /assets/js/ticker-features-daily-dashboard.js
(function () {
  var container = document.getElementById("ticker-features-daily-dashboard");
  if (!container) {
    console.warn("ticker-features-daily-dashboard element not found");
    return;
  }

  // Keep the snapshot in sync with Export 1's ticker selector
  var selectEl = document.getElementById("daily-activity-ticker");
  
  // UPDATED: Pointing to the new 8-ticker data file
  var DATA_URL = "/assets/data/ticker_features_daily_8tickers.json";

  var allRows = [];
  var currentTicker = (selectEl && selectEl.value) ? selectEl.value : "AAPL";

  // --- Formatting helpers --------------------------------------------------

  function fmtDateISO(s) {
    if (!s) return "";
    var d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function fmtMoney(val) {
    if (val == null || isNaN(val)) return "—";
    return "$" + Number(val).toFixed(2);
  }

  function fmtPct(val, decimals) {
    if (val == null || isNaN(val)) return "—";
    var pct = Number(val) * 100;
    return pct.toFixed(decimals != null ? decimals : 1) + "%";
  }

  function fmtInt(val) {
    if (val == null || isNaN(val)) return "—";
    var n = Math.round(Number(val));
    return n.toLocaleString("en-US");
  }

  function fmtMillions(val) {
    if (val == null || isNaN(val)) return "—";
    var n = Number(val);
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1) + "B";
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toLocaleString("en-US");
  }

  function fmtMult(val) {
    if (val == null || isNaN(val)) return "—";
    return Number(val).toFixed(2) + "×";
  }

  function fmtRatio(val) {
    if (val == null || isNaN(val)) return "—";
    return Number(val).toFixed(2);
  }

  // --- Data helpers --------------------------------------------------------

  function getRowsForTicker(ticker) {
    var rows = allRows.filter(function (row) {
      return row.underlying_ticker === ticker;
    });

    rows.sort(function (a, b) {
      var da = a.trade_date ? new Date(a.trade_date).getTime() : 0;
      var db = b.trade_date ? new Date(b.trade_date).getTime() : 0;
      return da - db;
    });

    return rows;
  }

  function getLatestRow(rows) {
    if (!rows || !rows.length) return null;
    return rows[rows.length - 1];
  }

  // --- Render snapshot only -----------------------------------------------

  function render() {
    container.innerHTML = "";

    var rows = getRowsForTicker(currentTicker);
    if (!rows.length) {
      var msg = document.createElement("p");
      msg.textContent = "No daily features available for " + currentTicker + ".";
      container.appendChild(msg);
      return;
    }

    var latest = getLatestRow(rows);

    var latestBlock = document.createElement("section");
    latestBlock.className = "ticker-features-latest";

    var heading = document.createElement("h3");
    heading.className = "ticker-features-heading";
    heading.textContent = currentTicker + " – Latest daily snapshot";

    var sub = document.createElement("p");
    sub.className = "ticker-features-subtitle";
    sub.textContent = "Latest trading day in this window: " + fmtDateISO(latest.trade_date);

    var grid = document.createElement("dl");
    grid.className = "ticker-features-summary-grid";

    function addMetric(label, value) {
      var dt = document.createElement("dt");
      dt.textContent = label;
      var dd = document.createElement("dd");
      dd.textContent = value;
      grid.appendChild(dt);
      grid.appendChild(dd);
    }

    addMetric("Close price", fmtMoney(latest.close_price));
    addMetric("1-day return", fmtPct(latest.return_1d, 2));
    addMetric("5-day return", fmtPct(latest.return_5d, 2));
    addMetric("Realized vol (20d ann.)", fmtPct(latest.realized_vol_20d_annualized, 1));
    addMetric("Underlying volume", fmtMillions(latest.underlying_volume));
    addMetric("Options volume (today)", fmtMillions(latest.option_volume_total));
    addMetric("Options volume (30d avg)", fmtMillions(latest.option_volume_30d_avg));
    addMetric("Options volume vs 30d avg", fmtMult(latest.option_volume_vs_30d));
    addMetric("Call/put volume ratio", fmtRatio(latest.call_put_ratio));

    latestBlock.appendChild(heading);
    latestBlock.appendChild(sub);
    latestBlock.appendChild(grid);

    container.appendChild(latestBlock);
  }

  function init() {
    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!rows || !rows.length) {
          container.textContent = "No daily features data available.";
          return;
        }

        allRows = rows.slice();
        render();

        if (selectEl) {
          selectEl.addEventListener("change", function (evt) {
            currentTicker = evt.target.value || "AAPL";
            render();
          });
        }
      })
      .catch(function (err) {
        console.error("Error loading ticker features data", err);
        container.textContent = "Unable to load daily features right now.";
      });
  }

  init();
})();

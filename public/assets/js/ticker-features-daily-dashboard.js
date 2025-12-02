// /assets/js/ticker-features-daily-dashboard.js
(function () {
  var container = document.getElementById("ticker-features-daily-dashboard");
  if (!container) {
    console.warn("ticker-features-daily-dashboard element not found");
    return;
  }

  // Reuse the same select as the options table so they stay in sync
  var selectEl = document.getElementById("ticker-options-select");
  var DATA_URL = "/assets/data/ticker_features_daily_5tickers.json";

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
    return Number(val).toLocaleString("en-US");
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
      // sort by trade_date ascending
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

  // --- Render functions ----------------------------------------------------

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

    // Wrapper
    var wrapper = document.createElement("div");
    wrapper.className = "ticker-features-wrapper";

    // --- Latest snapshot block --------------------------------------------
    var latestBlock = document.createElement("section");
    latestBlock.className = "ticker-features-latest";

    var heading = document.createElement("h3");
    heading.className = "ticker-features-heading";
    heading.textContent = currentTicker + " – Daily features snapshot";

    var sub = document.createElement("p");
    sub.className = "ticker-features-subtitle";
    sub.textContent = "As of " + fmtDateISO(latest.trade_date);

    var grid = document.createElement("dl");
    grid.className = "ticker-features-summary-grid";
    // Expect CSS to display this as a 2–3 column grid on larger screens.

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
    addMetric("Realized vol (20d, annualized)", fmtPct(latest.realized_vol_20d_annualized, 1));
    addMetric("Underlying volume", fmtInt(latest.underlying_volume));
    addMetric("Options volume (today)", fmtInt(latest.option_volume_total));
    addMetric("Options volume (30-day avg)", fmtInt(latest.option_volume_30d_avg));
    addMetric("Options volume vs 30-day avg", fmtMult(latest.option_volume_vs_30d));
    addMetric("Call/put volume ratio", fmtRatio(latest.call_put_ratio));

    latestBlock.appendChild(heading);
    latestBlock.appendChild(sub);
    latestBlock.appendChild(grid);

    // --- Recent history table ---------------------------------------------
    var historyBlock = document.createElement("section");
    historyBlock.className = "ticker-features-history";

    var histHeading = document.createElement("h4");
    histHeading.className = "ticker-features-history-heading";
    histHeading.textContent = "Recent daily history";

    var table = document.createElement("table");
    table.className = "options-table ticker-features-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");
    [
      "Date",
      "Close",
      "1-day return",
      "5-day return",
      "Realized vol (20d)",
      "Underlying volume",
      "Options volume",
      "Vol vs 30-day",
      "Call/put ratio"
    ].forEach(function (label) {
      var th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    table.appendChild(tbody);

    // Show up to last 60 days, newest on top
    var recent = rows.slice(-60).slice().reverse();

    recent.forEach(function (row) {
      var tr = document.createElement("tr");

      function addCell(text, className) {
        var td = document.createElement("td");
        if (className) td.className = className;
        td.textContent = text;
        tr.appendChild(td);
      }

      addCell(fmtDateISO(row.trade_date));
      addCell(fmtMoney(row.close_price));
      addCell(fmtPct(row.return_1d, 2));
      addCell(fmtPct(row.return_5d, 2));
      addCell(fmtPct(row.realized_vol_20d_annualized, 1));
      addCell(fmtInt(row.underlying_volume));
      addCell(fmtInt(row.option_volume_total));
      addCell(fmtMult(row.option_volume_vs_30d));
      addCell(fmtRatio(row.call_put_ratio));

      tbody.appendChild(tr);
    });

    historyBlock.appendChild(histHeading);
    historyBlock.appendChild(table);

    // Assemble
    wrapper.appendChild(latestBlock);
    wrapper.appendChild(historyBlock);
    container.appendChild(wrapper);
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

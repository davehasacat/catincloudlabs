// /assets/js/tickers-daily-activity-chart.js
(function () {
  var container = document.getElementById("tickers-daily-activity-chart");
  if (!container) {
    console.warn("tickers-daily-activity-chart element not found");
    return;
  }

  var selectEl = document.getElementById("daily-activity-ticker");
  if (!selectEl) {
    console.warn("daily-activity-ticker element not found");
    return;
  }

  // Adjust if your data file lives elsewhere
  var DATA_URL = "/assets/data/tickers_daily_activity_5tickers.json";

  var allRows = [];
  var currentTicker = selectEl.value || "AAPL";
  var isFirstRender = true;

  // Simple loading state
  var loadingEl = document.createElement("div");
  loadingEl.className = "chart-loading";
  loadingEl.textContent = "Loading daily price and options volume…";
  container.appendChild(loadingEl);

  function getFilteredRows() {
    return allRows.filter(function (row) {
      // JSON uses `ticker` for the underlying symbol
      return row.ticker === currentTicker;
    });
  }

  function buildTraces(rows) {
    // JSON schema:
    // {
    //   "trade_date": "2025-09-02",
    //   "ticker": "AAPL",
    //   "underlying_close_price": 229.72,
    //   "total_option_volume": 1089964,
    //   "volume_7d_avg": 780588.428
    // }

    var dates = rows.map(function (r) { return r.trade_date; });
    var closePrices = rows.map(function (r) { return r.underlying_close_price; });
    var volumes = rows.map(function (r) { return r.total_option_volume; });
    var volumeMa7 = rows.map(function (r) { return r.volume_7d_avg; });

    var priceTrace = {
      name: "Close price",
      x: dates,
      y: closePrices,
      type: "scatter",
      mode: "lines",
      yaxis: "y1",
      hovertemplate: "%{x}<br>Close: %{y:$,.2f}<extra></extra>"
    };

    var volumeTrace = {
      name: "Options volume",
      x: dates,
      y: volumes,
      type: "bar",
      yaxis: "y2",
      opacity: 0.7,
      hovertemplate: "%{x}<br>Options volume: %{y:,}<extra></extra>"
    };

    var volumeMaTrace = {
      name: "Options volume (7-day avg)",
      x: dates,
      y: volumeMa7,
      type: "scatter",
      mode: "lines",
      yaxis: "y2",
      line: { dash: "dot" },
      hovertemplate: "%{x}<br>7-day avg volume: %{y:,}<extra></extra>"
    };

    return [priceTrace, volumeTrace, volumeMaTrace];
  }

  function buildLayout() {
    return {
      margin: { t: 20, r: 40, b: 40, l: 50 },
      hovermode: "x unified",
      legend: { orientation: "h", x: 0, y: 1.15 },
      xaxis: {
        type: "date",
        title: "",
        tickformat: "%b %d"
      },
      yaxis: {
        title: "Close price",
        rangemode: "tozero",
        fixedrange: false
      },
      yaxis2: {
        title: "Options volume",
        overlaying: "y",
        side: "right",
        rangemode: "tozero",
        fixedrange: false
      }
    };
  }

  function buildConfig() {
    return {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: [
        "lasso2d",
        "select2d"
      ]
      // keep zoom, pan, download as image, etc.
    };
  }

  function renderChart() {
    var rows = getFilteredRows().slice();

    if (!rows.length) {
      container.innerHTML = "";
      var msg = document.createElement("p");
      msg.className = "chart-empty";
      msg.textContent =
        "No daily activity data available for " + currentTicker + " in this window.";
      container.appendChild(msg);
      return;
    }

    // Ensure dates are in ascending order
    rows.sort(function (a, b) {
      var da = new Date(a.trade_date).getTime();
      var db = new Date(b.trade_date).getTime();
      return da - db;
    });

    var traces = buildTraces(rows);
    var layout = buildLayout();
    var config = buildConfig();

    // Clear loading state on first render
    if (isFirstRender) {
      container.innerHTML = "";
    }

    var plotFn = isFirstRender ? Plotly.newPlot : Plotly.react;
    isFirstRender = false;

    plotFn(container, traces, layout, config);
  }

  function init() {
    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!rows || !rows.length) {
          container.innerHTML = "";
          var msg = document.createElement("p");
          msg.className = "chart-empty";
          msg.textContent =
            "No daily activity data available for this sample window.";
          container.appendChild(msg);
          return;
        }

        allRows = rows.slice();

        // Initial render
        renderChart();

        // Wire up ticker selector
        selectEl.addEventListener("change", function (evt) {
          currentTicker = evt.target.value;
          renderChart();
        });
      })
      .catch(function (err) {
        console.error("Error loading daily activity data", err);
        container.innerHTML = "";
        var msg = document.createElement("p");
        msg.className = "chart-empty";
        msg.textContent = "Unable to load daily activity data right now.";
        container.appendChild(msg);
      });
  }

  init();
})();

// /assets/js/tickers-daily-activity-chart.js
(function () {
  var el = document.getElementById("tickers-daily-activity-chart");
  if (!el) {
    console.warn("tickers-daily-activity-chart element not found");
    return;
  }

  var tickerSelect = document.getElementById("daily-activity-ticker");
  if (!tickerSelect) {
    console.warn("daily-activity-ticker <select> element not found");
    return;
  }

  // Correct data URL
  var DATA_URL = "/assets/data/daily_activity_5tickers.json";

  // Layouts (same behavior as the original AAPL chart)
  var desktopLayout = {
    margin: { l: 60, r: 50, t: 10, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    hovermode: "x unified",
    xaxis: {
      type: "date",
      title: "Trade date",
      showgrid: true,
      gridcolor: "#e5e7eb"
    },
    yaxis: {
      title: "Price (USD)",
      showgrid: true,
      gridcolor: "#e5e7eb"
    },
    yaxis2: {
      title: "Total options volume",
      overlaying: "y",
      side: "right",
      showgrid: false
    },
    legend: {
      orientation: "h",
      yanchor: "top",
      y: -0.25,
      xanchor: "center",
      x: 0.5
    }
  };

  // Mobile: hide right-axis tick labels to avoid clipping
  var mobileLayout = {
    margin: { l: 48, r: 12, t: 4, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    hovermode: "x unified",
    xaxis: {
      type: "date",
      title: "Trade date",
      showgrid: true,
      gridcolor: "#e5e7eb",
      tickfont: { size: 10 },
      titlefont: { size: 11 }
    },
    yaxis: {
      title: "Price (USD)",
      showgrid: true,
      gridcolor: "#e5e7eb",
      tickfont: { size: 10 },
      titlefont: { size: 11 }
    },
    yaxis2: {
      title: "",
      overlaying: "y",
      side: "right",
      showgrid: false,
      showticklabels: false,
      tickfont: { size: 10 }
    },
    legend: {
      orientation: "h",
      yanchor: "top",
      y: -0.3,
      xanchor: "center",
      x: 0.5,
      font: { size: 10 }
    },
    height: 320
  };

  function isNarrow() {
    return window.innerWidth <= 640;
  }

  function chooseLayout() {
    return isNarrow() ? mobileLayout : desktopLayout;
  }

  function chooseConfig() {
    var narrow = isNarrow();

    return {
      responsive: true,
      displaylogo: false,
      // Hide modebar on narrow/mobile, show on hover for desktop
      displayModeBar: narrow ? false : "hover",
      modeBarButtonsToRemove: [
        "select2d",
        "lasso2d",
        "zoomIn2d",
        "zoomOut2d",
        "autoScale2d",
        "resetScale2d",
        "hoverClosestCartesian",
        "hoverCompareCartesian",
        "toggleSpikelines"
      ]
    };
  }

  // Group rows by ticker and sort each group by trade_date ascending
  function groupByTicker(data) {
    var grouped = {};

    data.forEach(function (d) {
      var ticker = d.ticker || d.TICKER;
      if (!ticker) return;

      if (!grouped[ticker]) {
        grouped[ticker] = [];
      }
      grouped[ticker].push(d);
    });

    Object.keys(grouped).forEach(function (t) {
      grouped[t].sort(function (a, b) {
        var da = new Date(a.trade_date || a.TRADE_DATE);
        var db = new Date(b.trade_date || b.TRADE_DATE);
        return da - db;
      });
    });

    return grouped;
  }

  // Build Plotly traces for a specific ticker's rows
  function buildTraces(rows) {
    var dates   = rows.map(function (d) { return d.trade_date || d.TRADE_DATE; });
    var price   = rows.map(function (d) { return d.underlying_close_price || d.UNDERLYING_CLOSE_PRICE; });
    var volume  = rows.map(function (d) { return d.total_option_volume     || d.TOTAL_OPTION_VOLUME; });
    var vol7avg = rows.map(function (d) { return d.volume_7d_avg           || d.VOLUME_7D_AVG; });

    return [
      {
        x: dates,
        y: price,
        name: "Close price",
        type: "scatter",
        mode: "lines",
        line: { width: 2 },
        yaxis: "y"
      },
      {
        x: dates,
        y: volume,
        name: "Options volume",
        type: "bar",
        marker: { opacity: 0.8 },
        yaxis: "y2"
      },
      {
        x: dates,
        y: vol7avg,
        name: "Volume 7d avg",
        type: "scatter",
        mode: "lines",
        line: { dash: "dash", width: 2 },
        yaxis: "y2"
      }
    ];
  }

  var dataByTicker = {};

  fetch(DATA_URL)
    .then(function (r) { return r.json(); })
    .then(function (data) {
      console.log("Loaded daily activity data:", data.length, "rows");
      dataByTicker = groupByTicker(data);

      var initialTicker = tickerSelect.value || "AAPL";
      var initialRows = dataByTicker[initialTicker] || [];

      console.log(
        "Rendering daily activity chart for",
        initialTicker,
        "with",
        initialRows.length,
        "rows"
      );

      Plotly.newPlot(
        el,
        buildTraces(initialRows),
        chooseLayout(),
        chooseConfig()
      );

      // On ticker change, re-render with that ticker's data
      tickerSelect.addEventListener("change", function (evt) {
        var ticker = evt.target.value;
        var rows = dataByTicker[ticker] || [];
        console.log("Switching to ticker", ticker, "with", rows.length, "rows");

        Plotly.react(
          el,
          buildTraces(rows),
          chooseLayout(),
          chooseConfig()
        );
      });

      // On resize, re-render current ticker with updated layout/config
      window.addEventListener("resize", function () {
        var ticker = tickerSelect.value || "AAPL";
        var rows = dataByTicker[ticker] || [];

        Plotly.react(
          el,
          buildTraces(rows),
          chooseLayout(),
          chooseConfig()
        );
      });
    })
    .catch(function (err) {
      console.error("Error loading daily activity data", err);
      el.innerHTML = "";
      var msg = document.createElement("p");
      msg.className = "chart-empty";
      msg.textContent = "Unable to load daily activity data right now.";
      el.appendChild(msg);
    });
})();

// /assets/js/aapl_daily_chart.js
(function () {
  var el = document.getElementById("aapl-daily-activity-chart");
  if (!el) {
    console.warn("aapl-daily-activity-chart element not found");
    return;
  }

  fetch("/assets/data/aapl_daily_activity.json")
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var dates   = data.map(function (d) { return d.trade_date; });
      var price   = data.map(function (d) { return d.underlying_close_price; });
      var volume  = data.map(function (d) { return d.total_option_volume; });
      var vol7avg = data.map(function (d) { return d.volume_7d_avg; });

      var traces = [
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

      var desktopLayout = {
        margin: { l: 60, r: 60, t: 10, b: 40 },
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

      var mobileLayout = {
        margin: { l: 45, r: 30, t: 0, b: 40 },
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
          title: "",  // hide vertical title on small screens
          overlaying: "y",
          side: "right",
          showgrid: false,
          tickfont: { size: 10 }
        },
        legend: {
          orientation: "h",
          yanchor: "top",
          y: -0.32,
          xanchor: "center",
          x: 0.5,
          font: { size: 10 }
        }
      };

      function chooseLayout() {
        var isNarrow = window.innerWidth <= 640;
        return isNarrow ? mobileLayout : desktopLayout;
      }

      var config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["select2d", "lasso2d", "zoomIn2d", "zoomOut2d"]
      };

      console.log("Rendering AAPL chart with", data.length, "rows");
      Plotly.newPlot(el, traces, chooseLayout(), config);

      window.addEventListener("resize", function () {
        Plotly.react(el, traces, chooseLayout(), config);
      });
    })
    .catch(function (err) {
      console.error("Error loading AAPL chart data", err);
    });
})();

// /assets/js/aapl-daily-activity-chart.js

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var el = document.getElementById("aapl-daily-activity-chart");
    if (!el || !window.Plotly) return;

    fetch("/assets/data/aapl_daily_activity.json", { cache: "no-cache" })
      .then(function (resp) {
        if (!resp.ok) {
          throw new Error("Failed to load AAPL data JSON");
        }
        return resp.json();
      })
      .then(function (rows) {
        if (!Array.isArray(rows) || rows.length === 0) {
          throw new Error("No rows in AAPL JSON");
        }

        var dates = rows.map(function (r) { return r.trade_date; });
        var prices = rows.map(function (r) { return Number(r.underlying_close_price); });
        var volumes = rows.map(function (r) { return Number(r.total_option_volume); });
        var volAvg = rows.map(function (r) {
          return r.volume_7d_avg != null ? Number(r.volume_7d_avg) : null;
        });

        var priceTrace = {
          x: dates,
          y: prices,
          name: "Close price",
          type: "scatter",
          mode: "lines",
          line: { width: 2 },
          yaxis: "y1",
          hovertemplate: "%{x}<br>Close: %{y:$,.2f}<extra></extra>"
        };

        var volumeTrace = {
          x: dates,
          y: volumes,
          name: "Options volume",
          type: "bar",
          yaxis: "y2",
          opacity: 0.6,
          hovertemplate: "%{x}<br>Volume: %{y:,}<extra></extra>"
        };

        var volAvgTrace = {
          x: dates,
          y: volAvg,
          name: "Volume 7d avg",
          type: "scatter",
          mode: "lines",
          line: { width: 1.8, dash: "dash" },
          yaxis: "y2",
          hovertemplate: "%{x}<br>7d avg: %{y:,}<extra></extra>"
        };

        var layout = {
          margin: { t: 40, r: 60, b: 40, l: 56 },
          showlegend: true,
          legend: {
            orientation: "h",
            yanchor: "bottom",
            y: -0.2,
            xanchor: "center",
            x: 0.5
          },
          xaxis: {
            title: "Trade date",
            tickformat: "%b %d",
            hoverformat: "%Y-%m-%d"
          },
          yaxis: {
            title: "Price (USD)",
            fixedrange: true
          },
          yaxis2: {
            title: "Total options volume",
            overlaying: "y",
            side: "right",
            showgrid: false,
            fixedrange: true
          }
        };

        var config = {
          responsive: true,
          displaylogo: false,
          modeBarButtonsToRemove: [
            "toImage",
            "autoScale2d",
            "toggleSpikelines",
            "hoverClosestCartesian",
            "hoverCompareCartesian"
          ]
        };

        Plotly.newPlot(el, [priceTrace, volumeTrace, volAvgTrace], layout, config);
      })
      .catch(function (err) {
        console.error("Error rendering AAPL chart:", err);
        if (el) {
          el.innerHTML =
            '<p class="muted">Unable to load chart data right now. Please try refreshing the page.</p>';
        }
      });
  });
})();

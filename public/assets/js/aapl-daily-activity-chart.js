// /assets/js/aapl_daily_chart.js
(() => {
  const el = document.getElementById("aapl-daily-chart");
  if (!el) return;

  fetch("/assets/data/aapl_daily_activity.json")
    .then((r) => r.json())
    .then((data) => {
      const dates = data.map((d) => d.trade_date);
      const price = data.map((d) => d.underlying_close_price);
      const volume = data.map((d) => d.total_option_volume);
      const vol7 = data.map((d) => d.volume_7d_avg);

      const traces = [
        {
          x: dates,
          y: price,
          name: "Close price",
          type: "scatter",
          mode: "lines",
          line: { width: 2 },
          yaxis: "y",
        },
        {
          x: dates,
          y: volume,
          name: "Options volume",
          type: "bar",
          marker: { opacity: 0.8 },
          yaxis: "y2",
        },
        {
          x: dates,
          y: vol7,
          name: "Volume 7d avg",
          type: "scatter",
          mode: "lines",
          line: { dash: "dash", width: 2 },
          yaxis: "y2",
        },
      ];

      const baseLayout = {
        margin: { l: 60, r: 60, t: 10, b: 40 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        hovermode: "x unified",
        xaxis: {
          type: "date",
          title: "Trade date",
          showgrid: true,
          gridcolor: "#e5e7eb",
        },
        yaxis: {
          title: "Price (USD)",
          showgrid: true,
          gridcolor: "#e5e7eb",
        },
        yaxis2: {
          title: "Total options volume",
          overlaying: "y",
          side: "right",
          showgrid: false,
        },
        legend: {
          orientation: "h",
          yanchor: "top",
          y: -0.25,
          xanchor: "center",
          x: 0.5,
        },
      };

      const config = {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["select2d", "lasso2d", "zoomIn2d", "zoomOut2d"],
      };

      function getLayout() {
        const isNarrow = window.matchMedia("(max-width: 640px)").matches;

        if (!isNarrow) return baseLayout;

        // Mobile: tighter margins + smaller fonts + drop y2 title
        return {
          ...baseLayout,
          margin: { l: 45, r: 30, t: 0, b: 40 },
          legend: {
            ...baseLayout.legend,
            y: -0.32,
            font: { size: 10 },
          },
          xaxis: {
            ...baseLayout.xaxis,
            tickfont: { size: 10 },
            titlefont: { size: 11 },
          },
          yaxis: {
            ...baseLayout.yaxis,
            tickfont: { size: 10 },
            titlefont: { size: 11 },
          },
          yaxis2: {
            ...baseLayout.yaxis2,
            tickfont: { size: 10 },
            title: "", // hide vertical axis title on narrow screens
          },
        };
      }

      Plotly.newPlot(el, traces, getLayout(), config);

      // Recompute layout on resize
      window.addEventListener("resize", () => {
        Plotly.react(el, traces, getLayout(), config);
      });
    })
    .catch((err) => {
      console.error("Error loading AAPL chart data", err);
    });
})();

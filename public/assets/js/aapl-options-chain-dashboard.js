// aapl-options-chain-dashboard.js
// Renders a scatter plot of the latest AAPL options chain snapshot
// using data from /assets/data/aapl_options_chain_snapshot.json

(function () {
  const TARGET_ID = "aapl-options-chain-dashboard";
  const DATA_URL = "/assets/data/aapl_options_chain_snapshot.json";

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function initChart(records) {
    const container = document.getElementById(TARGET_ID);
    if (!container || !records || records.length === 0) {
      return;
    }

    // Light filtering: keep "near-term" expiries to avoid an unreadable wall of LEAPS.
    // Example: days_to_expiration <= 60, and reasonable volumes.
    const filtered = records.filter((r) => {
      const dte = safeNumber(r.days_to_expiration);
      return dte !== null && dte <= 60;
    });

    const calls = filtered.filter((r) => r.option_type === "C");
    const puts = filtered.filter((r) => r.option_type === "P");

    function buildTrace(data, name, color) {
      return {
        x: data.map((d) => safeNumber(d.strike_price)),
        y: data.map((d) => safeNumber(d.option_close_price)),
        text: data.map((d) => {
          const strike = d.strike_price;
          const expiry = d.expiration_date;
          const dte = d.days_to_expiration;
          const vol = d.option_volume;
          const moneyness = d.signed_moneyness_pct;
          const moneynessPct =
            typeof moneyness === "number"
              ? (moneyness * 100).toFixed(2) + "%"
              : String(moneyness ?? "");

          return (
            `Symbol: ${d.option_symbol}\n` +
            `Expiry: ${expiry} (${dte} days)\n` +
            `Strike: ${strike}\n` +
            `Close: ${d.option_close_price}\n` +
            `Volume: ${vol}\n` +
            `Signed moneyness: ${moneynessPct}`
          );
        }),
        mode: "markers",
        name,
        marker: {
          size: data.map((d) => {
            const vol = safeNumber(d.option_volume) || 0;
            // Soft size scaling: sublinear so big volumes don't dominate
            return 6 + Math.log10(1 + vol) * 4;
          }),
          opacity: 0.75,
          // leave color to Plotly's default if you prefer, or set explicit:
          // color,
        },
        hovertemplate:
          "%{text}<br>" +
          "Strike: %{x}<br>" +
          "Close: %{y}<extra>" +
          name +
          "</extra>",
      };
    }

    const traces = [];
    if (calls.length) traces.push(buildTrace(calls, "Calls (<=60d)", "#1f77b4"));
    if (puts.length) traces.push(buildTrace(puts, "Puts (<=60d)", "#ff7f0e"));

    const layout = {
      margin: { t: 40, r: 20, b: 60, l: 60 },
      xaxis: {
        title: "Strike price",
        zeroline: false,
      },
      yaxis: {
        title: "Option close price",
        zeroline: false,
      },
      legend: {
        orientation: "h",
        x: 0,
        y: 1.15,
      },
      hovermode: "closest",
      showlegend: true,
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
    };

    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["toImage", "select2d", "lasso2d"],
    };

    Plotly.newPlot(container, traces, layout, config);
  }

  function fetchDataAndRender() {
    fetch(DATA_URL, { cache: "no-cache" })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error("Failed to load options chain data");
        }
        return resp.json();
      })
      .then((data) => {
        initChart(data);
      })
      .catch((err) => {
        // Fail silently but log to console for debugging
        // eslint-disable-next-line no-console
        console.error("Error rendering AAPL options chain dashboard:", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fetchDataAndRender);
  } else {
    fetchDataAndRender();
  }
})();

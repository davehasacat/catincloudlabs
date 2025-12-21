(function () {
  // 1. Target the specific container
  var containerId = "mag7-chart";
  var container = document.getElementById(containerId);
  if (!container) return;

  // 2. Configuration
  var DATA_URL = "/assets/data/dashboard_mag7_momentum.json";
  var DEFAULT_TICKER = "NVDA";

  // 3. State
  var rawData = [];
  var uniqueTickers = [];
  var currentTicker = DEFAULT_TICKER;

  // 4. Helper: Format Currency
  var fmtMoney = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  });

  // 5. Build UI Controls (Ticker Dropdown)
  function buildControls() {
    // Create a toolbar div if it doesn't exist
    var toolbar = document.createElement("div");
    toolbar.className = "chart-toolbar";
    toolbar.style.marginBottom = "0.5rem";
    toolbar.style.display = "flex";
    toolbar.style.justifyContent = "flex-end";

    var label = document.createElement("label");
    label.textContent = "Ticker: ";
    label.style.fontSize = "0.85rem";
    label.style.color = "var(--text-muted)";
    label.style.marginRight = "0.5rem";

    var select = document.createElement("select");
    select.className = "input"; // Reuse your global input style
    select.style.padding = "0.2rem 0.5rem";
    select.style.width = "auto";
    select.style.fontSize = "0.85rem";

    uniqueTickers.sort().forEach(function (t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      if (t === currentTicker) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", function (e) {
      currentTicker = e.target.value;
      renderChart();
    });

    toolbar.appendChild(label);
    toolbar.appendChild(select);

    // Insert toolbar before the chart container's content
    container.parentElement.insertBefore(toolbar, container);
  }

  // 6. Render Chart using Plotly
  function renderChart() {
    // Filter data for the selected ticker
    var tickerData = rawData.filter(function (d) {
      return d.underlying_ticker === currentTicker;
    });

    // Sort by date ascending (vital for line charts)
    tickerData.sort(function (a, b) {
      return new Date(a.trade_date) - new Date(b.trade_date);
    });

    if (tickerData.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data available.</div>';
      return;
    }

    // Extract columns
    var dates = tickerData.map(function (d) { return d.trade_date; });
    var prices = tickerData.map(function (d) { return d.close_price; });
    var flows = tickerData.map(function (d) { return d.net_call_volume_flow; });
    var signals = tickerData.map(function (d) { return d.momentum_signal; });

    // Determine colors for flow bars (Green for +Flow, Red for -Flow)
    var flowColors = flows.map(function (v) {
      return v >= 0 ? "#16a34a" : "#dc2626"; // Tailwind Green-600 / Red-600
    });

    // --- Trace 1: Price (Line) ---
    var tracePrice = {
      x: dates,
      y: prices,
      type: "scatter",
      mode: "lines",
      name: "Price",
      line: { color: "#0ea5e9", width: 2 }, // Brand Blue
      hovertemplate: "<b>Price:</b> %{y:$.2f}<extra></extra>",
    };

    // --- Trace 2: Net Call Flow (Bar) ---
    var traceFlow = {
      x: dates,
      y: flows,
      type: "bar",
      name: "Net Call Flow",
      yaxis: "y2",
      marker: { color: flowColors },
      // Custom hover text to show the signal
      text: signals,
      hovertemplate:
        "<b>Flow:</b> %{y:,}<br>" +
        "<b>Signal:</b> %{text}<extra></extra>",
    };

    var data = [tracePrice, traceFlow];

    var layout = {
      font: { family: "ui-sans-serif, system-ui, sans-serif", size: 11 },
      margin: { t: 10, r: 10, l: 40, b: 40 },
      showlegend: false,
      hovermode: "x unified",
      plot_bgcolor: "transparent",
      paper_bgcolor: "transparent",
      
      // Setup Subplots (2 rows)
      grid: { rows: 2, columns: 1, roworder: 'top to bottom' },

      // X Axis (Shared)
      xaxis: {
        anchor: 'y2', // Align with bottom chart
        showgrid: false,
        zeroline: false,
        tickformat: "%b %d",
      },

      // Y Axis 1: Price (Top, takes 70% height)
      yaxis: {
        domain: [0.35, 1],
        title: { text: "Close Price ($)", font: { size: 10, color: "#6b7280" } },
        showgrid: true,
        gridcolor: "#f3f4f6",
        tickprefix: "$",
      },

      // Y Axis 2: Flow (Bottom, takes 25% height)
      yaxis2: {
        domain: [0, 0.25],
        title: { text: "Net Call Flow", font: { size: 10, color: "#6b7280" } },
        showgrid: true,
        gridcolor: "#f3f4f6",
      },
    };

    var config = {
      responsive: true,
      displayModeBar: false, // Clean look
    };

    Plotly.newPlot(container, data, layout, config);
  }

  // 7. Initialization
  function init() {
    container.innerHTML = '<div class="chart-loading">Loading momentum data...</div>';

    fetch(DATA_URL)
      .then(function (res) { return res.json(); })
      .then(function (json) {
        rawData = json;

        // Get unique tickers
        var set = new Set(rawData.map(function (d) { return d.underlying_ticker; }));
        uniqueTickers = Array.from(set);

        // Clear loading state
        container.innerHTML = "";

        // Render Controls & Chart
        buildControls();
        renderChart();
      })
      .catch(function (err) {
        console.error("Mag 7 Dashboard Error:", err);
        container.innerHTML = '<div class="chart-empty">Failed to load momentum data.</div>';
      });
  }

  init();
})();

(function () {
  // 1. Target the container
  var containerId = "macro-chart";
  var container = document.getElementById(containerId);
  if (!container) return;

  // 2. Configuration
  var DATA_URL = "/assets/data/dashboard_macro_gravity.json";
  var DEFAULT_TICKER = "IWM"; // Small caps often show the most interesting decoupling

  // 3. State
  var rawData = [];
  var uniqueTickers = [];
  var currentTicker = DEFAULT_TICKER;

  // 4. UI Controls
  function buildControls() {
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
    select.className = "input";
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
    container.parentElement.insertBefore(toolbar, container);
  }

  // 5. Render Chart
  function renderChart() {
    var tickerData = rawData.filter(function (d) {
      return d.underlying_ticker === currentTicker;
    });

    tickerData.sort(function (a, b) {
      return new Date(a.trade_date) - new Date(b.trade_date);
    });

    if (tickerData.length === 0) {
      container.innerHTML = '<div class="chart-empty">No data available.</div>';
      return;
    }

    var dates = tickerData.map(function(d) { return d.trade_date; });
    var prices = tickerData.map(function(d) { return d.close_price; });
    var corrs = tickerData.map(function(d) { return d.correlation_to_spy_20d; });
    var pcrs = tickerData.map(function(d) { return d.put_call_ratio; });
    var regimes = tickerData.map(function(d) { return d.sentiment_regime; });

    // --- Trace 1: Price (Top) ---
    var tracePrice = {
      x: dates,
      y: prices,
      type: "scatter",
      mode: "lines",
      name: "Price",
      line: { color: "#0ea5e9", width: 2 },
      hovertemplate: "<b>Price:</b> $%{y:.2f}<extra></extra>"
    };

    // --- Trace 2: Correlation (Bottom) ---
    // Color code the correlation line? Or just keep it simple purple/orange.
    // Let's use a distinct color for Gravity.
    var traceCorr = {
      x: dates,
      y: corrs,
      type: "scatter",
      mode: "lines",
      name: "Correlation (SPY)",
      yaxis: "y2",
      line: { color: "#8b5cf6", width: 2 }, // Violet
      fill: "tozeroy", // Fill to zero to emphasize magnitude
      fillcolor: "rgba(139, 92, 246, 0.1)",
      // Rich tooltip with PCR and Regime
      customdata: pcrs.map(function(p, i) { return [p, regimes[i]]; }),
      hovertemplate: 
        "<b>Corr vs SPY:</b> %{y:.2f}<br>" +
        "<b>PCR:</b> %{customdata[0]:.2f}<br>" +
        "<b>Regime:</b> %{customdata[1]}<extra></extra>"
    };

    var data = [tracePrice, traceCorr];

    var layout = {
      font: { family: "ui-sans-serif, system-ui, sans-serif", size: 11 },
      margin: { t: 10, r: 10, l: 40, b: 40 },
      showlegend: false,
      hovermode: "x unified",
      plot_bgcolor: "transparent",
      paper_bgcolor: "transparent",
      grid: { rows: 2, columns: 1, roworder: 'top to bottom' },
      
      xaxis: {
        anchor: 'y2',
        showgrid: false,
        zeroline: false,
        tickformat: "%b %d",
      },
      
      // Top Panel: Price
      yaxis: {
        domain: [0.35, 1],
        title: { text: "Close Price ($)", font: { size: 10, color: "#6b7280" } },
        showgrid: true,
        gridcolor: "#f3f4f6",
        tickprefix: "$"
      },
      
      // Bottom Panel: Correlation
      yaxis2: {
        domain: [0, 0.25],
        title: { text: "20d Corr (Gravity)", font: { size: 10, color: "#6b7280" } },
        showgrid: true,
        gridcolor: "#f3f4f6",
        range: [-1.1, 1.1], // Fixed range for correlation
        zeroline: true,
        zerolinecolor: "#9ca3af"
      }
    };

    var config = {
      responsive: true,
      displayModeBar: false
    };

    Plotly.newPlot(container, data, layout, config);
  }

  // 6. Init
  function init() {
    container.innerHTML = '<div class="chart-loading">Loading macro data...</div>';

    fetch(DATA_URL)
      .then(function(res) { return res.json(); })
      .then(function(json) {
        rawData = json;
        var set = new Set(rawData.map(function(d) { return d.underlying_ticker; }));
        uniqueTickers = Array.from(set);

        container.innerHTML = "";
        buildControls();
        renderChart();
      })
      .catch(function(err) {
        console.error("Macro Dashboard Error:", err);
        container.innerHTML = '<div class="chart-empty">Failed to load macro data.</div>';
      });
  }

  init();
})();

(function () {
  // 1. Target the container
  var containerId = "chaos-scatter-chart";
  var container = document.getElementById(containerId);
  if (!container) return;

  // 2. Configuration
  var DATA_URL = "/assets/data/dashboard_top_contracts.json";
  
  // HARDCODED SNAPSHOT DATE (End of 2025 data window)
  var SNAPSHOT_DATE = new Date("2025-12-19T00:00:00"); 

  // 3. State
  var rawData = [];
  var uniqueTickers = [];
  
  // 4. Helper: Calculate Days to Expiration relative to Snapshot Date
  function calculateDTE(expiryStr) {
    if (!expiryStr) return 0;
    var parts = expiryStr.split('-');
    // Parse expiry date (YYYY-MM-DD)
    var exp = new Date(parts[0], parts[1] - 1, parts[2]); 
    
    var diffTime = exp - SNAPSHOT_DATE;
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays < 0 ? 0 : diffDays;
  }

  // 5. Render Chart
  function renderChart() {
    if (rawData.length === 0) return;

    // Mobile Detection
    var isMobile = window.innerWidth < 768;

    var traces = [];
    
    uniqueTickers.forEach(function(ticker) {
      var tickerRows = rawData.filter(d => d.underlying_ticker === ticker);
      
      var x = tickerRows.map(d => calculateDTE(d.expiration_date));
      var y = tickerRows.map(d => d.signed_moneyness_pct * 100); 
      var sizes = tickerRows.map(d => d.total_volume);
      
      var text = tickerRows.map(d => 
        `<b>${d.option_symbol}</b><br>` +
        `Vol: ${d.total_volume.toLocaleString()}<br>` +
        `Strike: $${d.strike_price.toFixed(2)}<br>` +
        `Expiry: ${d.expiration_date}`
      );

      // RESPONSIVE TWEAK 1: Drastically smaller bubbles on mobile to clear space
      var maxVol = Math.max(...rawData.map(d => d.total_volume));
      var maxBubblePx = isMobile ? 25 : 50; 
      var markerSizes = sizes.map(s => Math.max(3, (s / maxVol) * maxBubblePx)); 

      var trace = {
        x: x,
        y: y,
        text: text,
        mode: 'markers',
        name: ticker,
        marker: {
          size: markerSizes,
          sizemode: 'diameter',
          opacity: 0.7,
          line: { width: 1, color: 'white' }
        },
        hovertemplate: 
          "%{text}<br>" +
          "DTE: %{x} days<br>" +
          "Moneyness: %{y:.1f}%<extra></extra>"
      };
      
      traces.push(trace);
    });

    // RESPONSIVE TWEAK 2: Annotation placement
    // Point arrow High (y=100) where it's empty, instead of y=50 (crowded)
    var annotation = {
      x: 0, y: 100,     // Arrow head points to the top of the risk curve
      xref: 'x', yref: 'y',
      text: "<b>The Gamma Casino</b><br>(0-DTE Speculation)",
      showarrow: true,
      arrowhead: 2,
      ax: isMobile ? 60 : 120,  // Tighter offset on mobile
      ay: isMobile ? -20 : -40, // Slight lift
      font: { color: "#ef4444", size: isMobile ? 10 : 11 },
      align: "left",
      bgcolor: "rgba(255, 255, 255, 0.9)", 
      borderpad: 4,
      arrowcolor: "#ef4444"
    };

    var layout = {
      font: { family: "ui-sans-serif, system-ui, sans-serif", size: 11 },
      margin: { t: 60, r: 20, l: 40, b: 50 },
      showlegend: true,
      legend: { 
        orientation: "h", 
        y: 1.15, 
        x: 0.5,
        xanchor: 'center',
        font: { size: isMobile ? 9 : 11 }
      },
      plot_bgcolor: "transparent",
      paper_bgcolor: "transparent",
      
      xaxis: {
        title: { text: "Days to Expiration (DTE)", font: { size: 12, color: "#6b7280" } },
        gridcolor: "#f3f4f6",
        zeroline: true,
        range: isMobile ? [-3, 40] : [-2, 45] 
      },
      
      yaxis: {
        title: { text: "% Out of The Money", font: { size: 12, color: "#6b7280" } },
        gridcolor: "#f3f4f6",
        zeroline: true,
        ticksuffix: "%"
      },
      
      annotations: [annotation]
    };

    var config = {
      responsive: true,
      displayModeBar: false
    };

    Plotly.newPlot(container, traces, layout, config);
  }

  // 6. Init
  function init() {
    container.innerHTML = '<div class="chart-loading">Loading chaos data...</div>';

    fetch(DATA_URL)
      .then(function(res) { return res.json(); })
      .then(function(json) {
        rawData = json;
        
        // Extract unique tickers and sort
        var set = new Set(rawData.map(function(d) { return d.underlying_ticker; }));
        uniqueTickers = Array.from(set).sort();

        container.innerHTML = "";
        renderChart();
      })
      .catch(function(err) {
        console.error("Chaos Scatter Error:", err);
        container.innerHTML = '<div class="chart-empty">Failed to load scatter data.</div>';
      });
  }

  init();
})();

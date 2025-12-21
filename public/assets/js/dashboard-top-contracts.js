(function () {
  // Target the container defined in projects.html
  var container = document.getElementById("top-contracts-chart");
  if (!container) return;

  // Configuration
  var DATA_URL = "/assets/data/dashboard_top_contracts.json";
  
  // State
  var allRows = [];
  var currentTicker = "NVDA"; // Default starting view
  var tickersList = [];       
  
  // Sorting & Pagination defaults
  var currentSortKey = "total_volume";
  var currentSortDir = "desc"; 
  var pageSize = 10;
  var currentPage = 0;

  // DOM References
  var controlsRef = null;
  var tableRef = null;
  var theadRef = null;
  var tbodyRef = null;
  var paginationRef = null;

  // Column Config
  var columns = [
    { label: "Ticker",       key: "underlying_ticker",    type: "string" },
    { label: "Expiry",       key: "expiration_date",      type: "date", fmt: fmtDate },
    { label: "Type",         key: "option_type",          type: "string" },
    { label: "Strike",       key: "strike_price",         type: "number", fmt: fmtMoney },
    { label: "Last Price",   key: "latest_close_price",   type: "number", fmt: fmtMoney },
    { label: "Volume",       key: "total_volume",         type: "number", fmt: fmtInt },
    { label: "Moneyness",    key: "signed_moneyness_pct", type: "number", fmt: fmtMoneyness },
    { label: "DTE",          key: "dte",                  type: "number", fmt: fmtInt, title: "Days to Expiration from today" } 
  ];

  // --- Formatting Helpers ---

  function fmtMoney(val) {
    if (val == null) return "-";
    return "$" + Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function fmtInt(val) {
    if (val == null) return "-";
    return Number(val).toLocaleString("en-US");
  }

  function fmtMoneyness(val) {
    if (val == null) return "-";
    var pct = Number(val) * 100;
    var sign = pct > 0 ? "+" : "";
    return sign + pct.toFixed(1) + "%";
  }

  function fmtDate(val) {
    if (!val) return "-";
    var parts = val.split('-');
    // Create date ignoring timezone offset
    var d = new Date(parts[0], parts[1] - 1, parts[2]); 
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
  }

  function calculateDTE(expiryStr) {
    if (!expiryStr) return 0;
    var today = new Date();
    today.setHours(0,0,0,0);
    
    var parts = expiryStr.split('-');
    var exp = new Date(parts[0], parts[1] - 1, parts[2]);
    
    var diffTime = exp - today;
    var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays < 0 ? 0 : diffDays;
  }

  // --- Logic ---

  function sortRows(rows) {
    rows.sort(function (a, b) {
      var valA = a[currentSortKey];
      var valB = b[currentSortKey];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === 'number') {
        return currentSortDir === 'asc' ? valA - valB : valB - valA;
      }
      if (valA < valB) return currentSortDir === 'asc' ? -1 : 1;
      if (valA > valB) return currentSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // --- DOM Builders ---

  function buildControls() {
    var wrapper = document.createElement("div");
    wrapper.className = "options-table-controls";
    wrapper.style.justifyContent = "space-between";
    wrapper.style.marginBottom = "0.75rem";

    var selectorWrapper = document.createElement("div");
    selectorWrapper.className = "ticker-label";
    
    var label = document.createElement("label");
    label.textContent = "Filter Ticker:";
    
    var select = document.createElement("select");
    select.className = "input"; 
    select.style.padding = "0.2rem 0.5rem";
    select.style.fontSize = "0.85rem";
    
    tickersList.sort().forEach(function(t) {
      var opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      if (t === currentTicker) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", function(e) {
      currentTicker = e.target.value;
      currentPage = 0;
      renderTable();
    });

    selectorWrapper.appendChild(label);
    selectorWrapper.appendChild(select);
    wrapper.appendChild(selectorWrapper);

    return wrapper;
  }

  function buildTableStructure() {
    var table = document.createElement("table");
    table.className = "options-table";

    var thead = document.createElement("thead");
    var tr = document.createElement("tr");
    
    columns.forEach(function(col) {
      var th = document.createElement("th");
      th.textContent = col.label;
      th.setAttribute("data-key", col.key);
      th.style.cursor = "pointer";
      if (col.title) th.title = col.title;
      
      th.addEventListener("click", function() {
        if (currentSortKey === col.key) {
          currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
        } else {
          currentSortKey = col.key;
          currentSortDir = "desc";
        }
        renderTable();
      });

      if (currentSortKey === col.key) {
        th.setAttribute("aria-sort", currentSortDir === "asc" ? "ascending" : "descending");
      }

      tr.appendChild(th);
    });
    
    thead.appendChild(tr);
    table.appendChild(thead);
    
    var tbody = document.createElement("tbody");
    table.appendChild(tbody);

    return { table: table, thead: thead, tbody: tbody };
  }

  function buildPagination(totalRows) {
    var wrapper = document.createElement("div");
    wrapper.className = "options-table-pagination";

    var info = document.createElement("span");
    var start = (currentPage * pageSize) + 1;
    var end = Math.min((currentPage + 1) * pageSize, totalRows);
    info.textContent = totalRows > 0 ? `Showing ${start}–${end} of ${totalRows}` : "No results";
    info.className = "options-table-status";

    var btnGroup = document.createElement("div");
    btnGroup.className = "options-table-pagination__controls";

    var prev = document.createElement("button");
    prev.className = "options-table-pagination__btn";
    prev.textContent = "← Prev";
    prev.disabled = currentPage === 0;
    prev.onclick = function() { currentPage--; renderTable(); };

    var next = document.createElement("button");
    next.className = "options-table-pagination__btn";
    next.textContent = "Next →";
    next.disabled = end >= totalRows;
    next.onclick = function() { currentPage++; renderTable(); };

    btnGroup.appendChild(prev);
    btnGroup.appendChild(next);

    wrapper.appendChild(info);
    wrapper.appendChild(btnGroup);
    
    return wrapper;
  }

  // --- Render ---

  function renderTable() {
    var filteredData = allRows.filter(function(r) {
      return r.underlying_ticker === currentTicker;
    });

    sortRows(filteredData);

    var startIdx = currentPage * pageSize;
    var pageData = filteredData.slice(startIdx, startIdx + pageSize);

    tbodyRef.innerHTML = "";
    
    if (pageData.length === 0) {
      var tr = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = columns.length;
      td.textContent = "No contracts found for " + currentTicker;
      td.style.textAlign = "center";
      td.style.padding = "2rem";
      tr.appendChild(td);
      tbodyRef.appendChild(tr);
    } else {
      pageData.forEach(function(row) {
        var tr = document.createElement("tr");
        columns.forEach(function(col) {
          var td = document.createElement("td");
          var val = row[col.key];
          
          if (col.fmt) {
            td.textContent = col.fmt(val);
          } else {
            td.textContent = val;
          }

          // Styling cues
          if (col.key === "signed_moneyness_pct") {
            td.style.color = val > 0 ? "var(--accent-600)" : "var(--text-muted)";
          }
          if (col.key === "option_type") {
             td.style.fontWeight = "600";
             td.style.color = val === "C" ? "#16a34a" : "#dc2626"; // Green/Red
          }

          tr.appendChild(td);
        });
        tbodyRef.appendChild(tr);
      });
    }

    // Update Headers
    Array.from(theadRef.querySelectorAll("th")).forEach(function(th) {
      th.removeAttribute("aria-sort");
      if (th.getAttribute("data-key") === currentSortKey) {
        th.setAttribute("aria-sort", currentSortDir === "asc" ? "ascending" : "descending");
      }
    });

    // Update Pagination
    if (paginationRef) container.removeChild(paginationRef);
    paginationRef = buildPagination(filteredData.length);
    container.appendChild(paginationRef);
  }

  // --- Init ---

  function init() {
    container.innerHTML = '<div class="chart-loading">Loading market snapshot...</div>';

    fetch(DATA_URL)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        allRows = data.map(function(r) {
          r.dte = calculateDTE(r.expiration_date);
          return r;
        });

        // Get unique tickers for dropdown
        var distinctTickers = new Set(allRows.map(r => r.underlying_ticker));
        tickersList = Array.from(distinctTickers);

        container.innerHTML = "";

        controlsRef = buildControls();
        container.appendChild(controlsRef);

        var struct = buildTableStructure();
        tableRef = struct.table;
        theadRef = struct.thead;
        tbodyRef = struct.tbody;
        container.appendChild(tableRef);

        renderTable();
      })
      .catch(function(err) {
        console.error(err);
        container.innerHTML = '<div class="chart-empty">Unable to load top contracts snapshot.</div>';
      });
  }

  init();
})();

// /assets/js/tickers-options-chain-dashboard.js
(function () {
  var container = document.getElementById("tickers-options-chain-dashboard");
  if (!container) {
    console.warn("tickers-options-chain-dashboard element not found");
    return;
  }

  // Shared ticker selector used by Export 1 + Export 3
  var controllerSelect = document.getElementById("daily-activity-ticker");

  // Ticker label already present in the HTML copy
  var tickerLabelEl = document.getElementById("options-table-ticker-label");

  // UPDATED: Pointing to the new 8-ticker data file
  var DATA_URL = "/assets/data/options_top_contracts_8tickers.json";
  
  var allRows = [];

  var currentTicker =
    (controllerSelect && controllerSelect.value) ? controllerSelect.value : "AAPL";

  // Sorting state
  var currentSortKey = "total_volume";
  var currentSortDir = "desc"; // "asc" | "desc"

  // Pagination state
  var pageSize = 10;
  var currentPage = 0; // 0-based

  // DOM refs we fill in during init
  var tableRef = null;
  var theadRef = null;
  var tbodyRef = null;
  var paginationRef = null;

  // Map headers to data keys + sort types
  var columns = [
    { label: "Expiry",       key: "expiration_date",      type: "date" },
    { label: "Type",         key: "option_type",          type: "string" },
    { label: "Strike",       key: "strike_price",         type: "number" },
    { label: "Last price",   key: "latest_close_price",   type: "number" },
    { label: "Total volume", key: "total_volume",         type: "number" },
    {
      label: "DTE",
      key: "days_to_expiration",
      type: "number",
      title: "DTE = Days to Expiration at the end of the window. Expired contracts show DTE = 0."
    },
    { label: "Moneyness",    key: "signed_moneyness_pct", type: "number" }
  ];

  // --- Formatting helpers --------------------------------------------------

  function fmtMoney(val) {
    if (val == null) return "";
    return "$" + Number(val).toFixed(2);
  }

  function fmtInt(val) {
    if (val == null) return "";
    return Number(val).toLocaleString("en-US");
  }

  // Clamp display DTE at 0; keep raw value for sorting and JSON
  function fmtDte(val) {
    if (val == null) return "";
    var n = Number(val);
    if (isNaN(n)) return "";
    var display = n <= 0 ? 0 : n;
    return String(display);
  }

  function fmtMoneyness(val) {
    if (val == null) return "";
    var pct = Number(val) * 100;
    return pct.toFixed(1) + "%";
  }

  function fmtDateISO(s) {
    if (!s) return "";
    var d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  // --- Sorting helpers -----------------------------------------------------

  function getColumnType(key) {
    var col = columns.find(function (c) { return c.key === key; });
    return col ? col.type : "string";
  }

  function compareValues(a, b, type, dir) {
    var va = a;
    var vb = b;

    if (type === "number" || type === "date") {
      if (type === "number") {
        va = (va == null || va === "") ? NaN : Number(va);
        vb = (vb == null || vb === "") ? NaN : Number(vb);
      } else if (type === "date") {
        va = va ? new Date(va).getTime() : NaN;
        vb = vb ? new Date(vb).getTime() : NaN;
      }

      // Handle NaNs for numeric/date types
      if (isNaN(va) && !isNaN(vb)) return dir === "asc" ? 1 : -1;
      if (!isNaN(va) && isNaN(vb)) return dir === "asc" ? -1 : 1;
      if (isNaN(va) && isNaN(vb)) return 0;

      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    }

    // String (and other) types: plain lexicographic compare
    va = (va == null ? "" : String(va));
    vb = (vb == null ? "" : String(vb));

    if (va < vb) return dir === "asc" ? -1 : 1;
    if (va > vb) return dir === "asc" ? 1 : -1;
    return 0;
  }

  function sortRows(rows, key, type, dir) {
    rows.sort(function (a, b) {
      var primary = compareValues(a[key], b[key], type, dir);
      if (primary !== 0) return primary;

      // Tie-breakers: volume desc, then expiry, then strike
      if (key !== "total_volume") {
        var tPrimary = compareValues(
          a["total_volume"],
          b["total_volume"],
          "number",
          "desc"
        );
        if (tPrimary !== 0) return tPrimary;
      }
      var tExpiry = compareValues(
        a["expiration_date"],
        b["expiration_date"],
        "date",
        "asc"
      );
      if (tExpiry !== 0) return tExpiry;
      return compareValues(
        a["strike_price"],
        b["strike_price"],
        "number",
        "asc"
      );
    });
  }

  function updateAriaSort(thead, targetTh) {
    Array.prototype.forEach.call(
      thead.querySelectorAll("th"),
      function (th) {
        th.setAttribute("aria-sort", "none");
      }
    );
    if (targetTh) {
      targetTh.setAttribute(
        "aria-sort",
        currentSortDir === "asc" ? "ascending" : "descending"
      );
    }
  }

  // --- Data helpers --------------------------------------------------------

  function getFilteredRows() {
    return allRows.filter(function (row) {
      return row.underlying_ticker === currentTicker;
    });
  }

  // --- DOM builders --------------------------------------------------------

  function buildTable() {
    var table = document.createElement("table");
    table.className = "options-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");

    columns.forEach(function (col, idx) {
      var th = document.createElement("th");
      th.setAttribute("data-key", col.key);
      th.setAttribute("data-type", col.type);
      th.setAttribute("data-index", idx);
      th.setAttribute("aria-sort", "none");

      // Special-case DTE to use an <abbr> with a tooltip
      if (col.key === "days_to_expiration" && col.title) {
        var abbr = document.createElement("abbr");
        abbr.textContent = col.label;
        abbr.title = col.title;
        th.appendChild(abbr);
      } else {
        th.textContent = col.label;
      }

      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = document.createElement("tbody");
    table.appendChild(tbody);

    // Clicking headers to sort
    thead.addEventListener("click", function (evt) {
      var th = evt.target.closest("th");
      if (!th) return;

      var key = th.getAttribute("data-key");
      var type = th.getAttribute("data-type") || "string";
      if (!key) return;

      if (currentSortKey === key) {
        // toggle direction
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = key;
        // default: numbers & dates desc for "bigger first", strings asc
        if (type === "number" || type === "date") {
          currentSortDir = "desc";
        } else {
          currentSortDir = "asc";
        }
      }

      // When sort changes, go back to the first page
      currentPage = 0;
      renderBody(th);
    });

    return { table: table, thead: thead, tbody: tbody };
  }

  // We now just update the bold ticker label in the existing HTML
  function updateStatus(/* totalRows */) {
    if (!tickerLabelEl) return;
    tickerLabelEl.textContent = currentTicker;
  }

  // Pagination controls
  function renderPagination(totalRows, totalPages) {
    if (!paginationRef) return;

    paginationRef.innerHTML = "";

    if (!totalRows || totalPages <= 1) {
      return; // nothing to paginate
    }

    var wrapper = document.createElement("div");
    wrapper.className = "options-table-pagination";

    var start = currentPage * pageSize + 1;
    var end = Math.min(totalRows, (currentPage + 1) * pageSize);

    var summary = document.createElement("span");
    summary.className = "options-table-pagination__summary";
    summary.textContent = "Showing " + start + "–" + end + " of " + totalRows;

    var controls = document.createElement("div");
    controls.className = "options-table-pagination__controls";

    function makeButton(label, disabled, delta) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "options-table-pagination__btn";
      btn.textContent = label;
      if (disabled) {
        btn.disabled = true;
      } else {
        btn.addEventListener("click", function () {
          currentPage += delta;
          renderBody(null);
        });
      }
      return btn;
    }

    var prevDisabled = currentPage === 0;
    var nextDisabled = currentPage >= totalPages - 1;

    var prevBtn = makeButton("← Previous 10", prevDisabled, -1);
    var nextBtn = makeButton("Next 10 →", nextDisabled, +1);

    controls.appendChild(prevBtn);
    controls.appendChild(nextBtn);

    wrapper.appendChild(summary);
    wrapper.appendChild(controls);

    paginationRef.appendChild(wrapper);
  }

  // --- Render body (honors sort + pagination) ------------------------------

  function renderBody(activeTh) {
    if (!tableRef || !theadRef || !tbodyRef) return;

    var rows = getFilteredRows().slice();

    tbodyRef.innerHTML = "";

    if (!rows.length) {
      var emptyRow = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = columns.length;
      td.textContent =
        "No options data available for " + currentTicker + " in this window.";
      emptyRow.appendChild(td);
      tbodyRef.appendChild(emptyRow);

      updateAriaSort(theadRef, null);
      updateStatus(0);
      if (paginationRef) paginationRef.innerHTML = "";
      return;
    }

    var sortType = getColumnType(currentSortKey);
    sortRows(rows, currentSortKey, sortType, currentSortDir);

    var totalRows = rows.length;
    var totalPages = Math.ceil(totalRows / pageSize);
    if (totalPages < 1) totalPages = 1;

    // Clamp currentPage into valid range
    if (currentPage >= totalPages) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;

    var startIdx = currentPage * pageSize;
    var endIdx = startIdx + pageSize;
    var pageRows = rows.slice(startIdx, endIdx);

    updateAriaSort(
      theadRef,
      activeTh || theadRef.querySelector('th[data-key="' + currentSortKey + '"]')
    );

    pageRows.forEach(function (row) {
      var tr = document.createElement("tr");

      function addCell(text) {
        var td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      }

      var expiryLabel = fmtDateISO(row.expiration_date);
      var typeLabel =
        row.option_type === "C"
          ? "Call"
          : row.option_type === "P"
          ? "Put"
          : row.option_type || "";

      addCell(expiryLabel);
      addCell(typeLabel);
      addCell(fmtMoney(row.strike_price));
      addCell(fmtMoney(row.latest_close_price));
      addCell(fmtInt(row.total_volume));
      addCell(fmtDte(row.days_to_expiration));
      addCell(fmtMoneyness(row.signed_moneyness_pct));

      tbodyRef.appendChild(tr);
    });

    updateStatus(totalRows);
    renderPagination(totalRows, totalPages);
  }

  // --- Ticker wiring -------------------------------------------------------

  function onTickerChange(evt) {
    var nextTicker = evt && evt.target && evt.target.value
      ? evt.target.value
      : currentTicker;

    currentTicker = nextTicker || "AAPL";
    currentPage = 0; // reset page when ticker changes
    renderBody(null);
  }

  // --- Init ---------------------------------------------------------------

  function init() {
    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!rows || !rows.length) {
          container.textContent = "No options data available for the current window.";
          return;
        }

        allRows = rows.slice();

        // Clear container and build table + pagination roots
        container.innerHTML = "";

        var build = buildTable();
        tableRef = build.table;
        theadRef = build.thead;
        tbodyRef = build.tbody;

        container.appendChild(tableRef);

        paginationRef = document.createElement("div");
        paginationRef.className = "options-table-pagination-root";
        container.appendChild(paginationRef);

        // Initial render (default sort: total_volume desc, first page)
        renderBody(
          theadRef.querySelector('th[data-key="total_volume"]')
        );

        // Wire up shared ticker selector if present
        if (controllerSelect) {
          controllerSelect.addEventListener("change", onTickerChange);
        }
      })
      .catch(function (err) {
        console.error("Error loading options table data", err);
        container.textContent = "Unable to load options data right now.";
      });
  }

  init();
})();

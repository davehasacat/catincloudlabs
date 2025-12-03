// /assets/js/tickers-options-chain-dashboard.js
(function () {
  var container = document.getElementById("tickers-options-chain-dashboard");
  if (!container) {
    console.warn("tickers-options-chain-dashboard element not found");
    return;
  }

  // Reuse the same ticker selector as Export 1 / 3
  var tickerSelect = document.getElementById("daily-activity-ticker");
  if (!tickerSelect) {
    console.warn("daily-activity-ticker <select> element not found");
    return;
  }

  // Span in the copy above the table that shows the current ticker
  var tickerLabelSpan = document.getElementById("options-table-ticker-label");

  var DATA_URL = "/assets/data/options_top_contracts_5tickers.json";
  var allRows = [];
  var currentTicker = tickerSelect.value || "AAPL";

  // Pagination state
  var PAGE_SIZE = 10;
  var currentPageIndex = 0; // 0-based

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

  // Formatting helpers
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

  // Sorting helpers
  var currentSortKey = "total_volume";
  var currentSortDir = "desc"; // "asc" | "desc"

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

      // Handle NaNs
      if (isNaN(va) && !isNaN(vb)) return dir === "asc" ? 1 : -1;
      if (!isNaN(va) && isNaN(vb)) return dir === "asc" ? -1 : 1;
      if (isNaN(va) && isNaN(vb)) return 0;

      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    }

    // String / other types
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

      // Tie-breakers: volume desc, then expiry asc, then strike asc
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

  function getFilteredRows() {
    return allRows.filter(function (row) {
      return row.underlying_ticker === currentTicker;
    });
  }

  // --- Table + pagination building ----------------------------------------

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

    // Header click sorting
    thead.addEventListener("click", function (evt) {
      var th = evt.target.closest("th");
      if (!th) return;

      var key = th.getAttribute("data-key");
      var type = th.getAttribute("data-type") || "string";
      if (!key) return;

      if (currentSortKey === key) {
        currentSortDir = currentSortDir === "asc" ? "desc" : "asc";
      } else {
        currentSortKey = key;
        if (type === "number" || type === "date") {
          currentSortDir = "desc";
        } else {
          currentSortDir = "asc";
        }
      }

      // Reset to first page when changing sort
      currentPageIndex = 0;
      renderBody(table, thead, tbody, th);
    });

    // Pagination controls
    var pager = document.createElement("div");
    pager.className = "options-table-pager";

    var prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.textContent = "Previous";
    prevBtn.className = "options-table-page-btn";

    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.textContent = "Next";
    nextBtn.className = "options-table-page-btn";

    var infoSpan = document.createElement("span");
    infoSpan.className = "options-table-page-info";

    pager.appendChild(prevBtn);
    pager.appendChild(infoSpan);
    pager.appendChild(nextBtn);

    prevBtn.addEventListener("click", function () {
      if (currentPageIndex > 0) {
        currentPageIndex -= 1;
        renderBody(table, thead, tbody, null, infoSpan, prevBtn, nextBtn);
      }
    });

    nextBtn.addEventListener("click", function () {
      var totalRows = getFilteredRows().length;
      var maxPageIndex = Math.max(0, Math.ceil(totalRows / PAGE_SIZE) - 1);
      if (currentPageIndex < maxPageIndex) {
        currentPageIndex += 1;
        renderBody(table, thead, tbody, null, infoSpan, prevBtn, nextBtn);
      }
    });

    return {
      table: table,
      thead: thead,
      tbody: tbody,
      pager: pager,
      infoSpan: infoSpan,
      prevBtn: prevBtn,
      nextBtn: nextBtn
    };
  }

  function renderBody(table, thead, tbody, activeTh, infoSpan, prevBtn, nextBtn) {
    var rowsToRender = getFilteredRows().slice();
    var totalRows = rowsToRender.length;

    tbody.innerHTML = "";

    if (!rowsToRender.length) {
      var emptyRow = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = columns.length;
      td.textContent = "No options data available for " + currentTicker + " in this window.";
      emptyRow.appendChild(td);
      tbody.appendChild(emptyRow);

      updateAriaSort(thead, null);
      if (infoSpan) infoSpan.textContent = "";
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    var sortType = getColumnType(currentSortKey);
    sortRows(rowsToRender, currentSortKey, sortType, currentSortDir);
    updateAriaSort(
      thead,
      activeTh || thead.querySelector('th[data-key="' + currentSortKey + '"]')
    );

    // Clamp page index
    var maxPageIndex = Math.max(0, Math.ceil(totalRows / PAGE_SIZE) - 1);
    if (currentPageIndex > maxPageIndex) currentPageIndex = maxPageIndex;

    var start = currentPageIndex * PAGE_SIZE;
    var end = Math.min(start + PAGE_SIZE, totalRows);
    var pageRows = rowsToRender.slice(start, end);

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

      tbody.appendChild(tr);
    });

    if (infoSpan) {
      infoSpan.textContent =
        "Showing " + (start + 1) + "–" + end + " of " + totalRows + " contracts";
    }
    if (prevBtn) prevBtn.disabled = currentPageIndex === 0;
    if (nextBtn) nextBtn.disabled = currentPageIndex >= maxPageIndex;
  }

  function updateTickerLabel() {
    if (!tickerLabelSpan) return;
    tickerLabelSpan.textContent = currentTicker || "—";
  }

  function init() {
    fetch(DATA_URL)
      .then(function (r) { return r.json(); })
      .then(function (rows) {
        if (!rows || !rows.length) {
          container.textContent = "No options data available for the current window.";
          return;
        }

        allRows = rows.slice();

        var build = buildTable();
        container.innerHTML = "";
        container.appendChild(build.table);
        container.appendChild(build.pager);

        // Initial label + render
        updateTickerLabel();
        renderBody(
          build.table,
          build.thead,
          build.tbody,
          build.thead.querySelector('th[data-key="total_volume"]'),
          build.infoSpan,
          build.prevBtn,
          build.nextBtn
        );

        // Keep in sync with the main ticker selector
        tickerSelect.addEventListener("change", function (evt) {
          currentTicker = evt.target.value || "AAPL";
          currentPageIndex = 0;
          updateTickerLabel();
          renderBody(
            build.table,
            build.thead,
            build.tbody,
            null,
            build.infoSpan,
            build.prevBtn,
            build.nextBtn
          );
        });
      })
      .catch(function (err) {
        console.error("Error loading options table data", err);
        container.textContent = "Unable to load options data right now.";
      });
  }

  init();
})();

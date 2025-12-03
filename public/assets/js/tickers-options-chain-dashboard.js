// /assets/js/tickers-options-chain-dashboard.js
(function () {
  var container = document.getElementById("tickers-options-chain-dashboard");
  if (!container) {
    console.warn("tickers-options-chain-dashboard element not found");
    return;
  }

  var selectEl = document.getElementById("ticker-options-select");
  if (!selectEl) {
    console.warn("ticker-options-select element not found");
    return;
  }

  var DATA_URL = "/assets/data/options_top_contracts_5tickers.json";
  var allRows = [];
  var currentTicker = selectEl.value || "AAPL";

  // Map headers to data keys + sort types
  var columns = [
    { label: "Expiry",       key: "expiration_date",      type: "date" },
    { label: "Type",         key: "option_type",          type: "string" },
    { label: "Strike",       key: "strike_price",         type: "number" },
    { label: "Last price",   key: "latest_close_price",   type: "number" },
    { label: "Total volume", key: "total_volume",         type: "number" },
    { label: "DTE",          key: "days_to_expiration",   type: "number" },
    { label: "Moneyness",    key: "signed_moneyness_pct", type: "number" }
  ];

  // Formatting helpers (same as AAPL-only)
  function fmtMoney(val) {
    if (val == null) return "";
    return "$" + Number(val).toFixed(2);
  }

  function fmtInt(val) {
    if (val == null) return "";
    return Number(val).toLocaleString("en-US");
  }

  function fmtDte(val) {
    if (val == null) return "";
    return Number(val);
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

  // Sorting helpers (adapted from AAPL-only)
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

  function getFilteredRows() {
    return allRows.filter(function (row) {
      return row.underlying_ticker === currentTicker;
    });
  }

  function buildTable() {
    var table = document.createElement("table");
    table.className = "options-table";

    var thead = document.createElement("thead");
    var headRow = document.createElement("tr");

    columns.forEach(function (col, idx) {
      var th = document.createElement("th");
      th.textContent = col.label;
      th.setAttribute("data-key", col.key);
      th.setAttribute("data-type", col.type);
      th.setAttribute("data-index", idx);
      th.setAttribute("aria-sort", "none");
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

      renderBody(table, thead, tbody, th);
    });

    return { table: table, thead: thead, tbody: tbody };
  }

  function renderBody(table, thead, tbody, activeTh) {
    var rowsToRender = getFilteredRows().slice();

    tbody.innerHTML = "";

    if (!rowsToRender.length) {
      var emptyRow = document.createElement("tr");
      var td = document.createElement("td");
      td.colSpan = columns.length;
      td.textContent = "No options data available for " + currentTicker + " in this window.";
      emptyRow.appendChild(td);
      tbody.appendChild(emptyRow);

      updateAriaSort(thead, null);
      return;
    }

    var sortType = getColumnType(currentSortKey);
    sortRows(rowsToRender, currentSortKey, sortType, currentSortDir);
    updateAriaSort(
      thead,
      activeTh || thead.querySelector('th[data-key="' + currentSortKey + '"]')
    );

    rowsToRender.forEach(function (row) {
      var tr = document.createElement("tr");

      function addCell(text, className) {
        var td = document.createElement("td");
        if (className) td.className = className;
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

        // Initial render (default sort: total_volume desc)
        renderBody(build.table, build.thead, build.tbody, build.thead.querySelector('th[data-key="total_volume"]'));

        // Wire dropdown
        selectEl.addEventListener("change", function (evt) {
          currentTicker = evt.target.value;
          renderBody(build.table, build.thead, build.tbody, null);
        });
      })
      .catch(function (err) {
        console.error("Error loading options table data", err);
        container.textContent = "Unable to load options data right now.";
      });
  }

  init();
})();

// /assets/js/aapl-options-chain-dashboard.js
(function () {
  var container = document.getElementById("aapl-options-chain-dashboard");
  if (!container) {
    console.warn("aapl-options-chain-dashboard element not found");
    return;
  }

  fetch("/assets/data/aapl_options_top_contracts.json")
    .then(function (r) { return r.json(); })
    .then(function (rows) {
      if (!rows || !rows.length) {
        container.textContent = "No options data available for the current window.";
        return;
      }

      var data = rows.slice(); // local copy for sorting

      var table = document.createElement("table");
      table.className = "options-table";

      var thead = document.createElement("thead");
      var headRow = document.createElement("tr");

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

      function renderBody(rowsToRender) {
        tbody.innerHTML = "";

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

      // Sorting helpers
      var currentSortKey = "total_volume";
      var currentSortDir = "desc"; // "asc" | "desc"

      function compareValues(a, b, type, dir) {
        var va = a;
        var vb = b;

        if (type === "number") {
          va = (va == null || va === "") ? NaN : Number(va);
          vb = (vb == null || vb === "") ? NaN : Number(vb);
        } else if (type === "date") {
          va = va ? new Date(va).getTime() : NaN;
          vb = vb ? new Date(vb).getTime() : NaN;
        } else {
          va = (va == null ? "" : String(va));
          vb = (vb == null ? "" : String(vb));
        }

        if (isNaN(va) && !isNaN(vb)) return dir === "asc" ? 1 : -1;
        if (!isNaN(va) && isNaN(vb)) return dir === "asc" ? -1 : 1;
        if (isNaN(va) && isNaN(vb)) return 0;

        if (va < vb) return dir === "asc" ? -1 : 1;
        if (va > vb) return dir === "asc" ? 1 : -1;
        return 0;
      }

      function sortData(key, type, dir) {
        data.sort(function (a, b) {
          var primary = compareValues(a[key], b[key], type, dir);
          if (primary !== 0) return primary;

          // Tie-breakers: volume desc, then expiry, then strike
          if (key !== "total_volume") {
            var tPrimary = compareValues(a["total_volume"], b["total_volume"], "number", "desc");
            if (tPrimary !== 0) return tPrimary;
          }
          var tExpiry = compareValues(a["expiration_date"], b["expiration_date"], "date", "asc");
          if (tExpiry !== 0) return tExpiry;
          return compareValues(a["strike_price"], b["strike_price"], "number", "asc");
        });
      }

      function updateAriaSort(targetTh) {
        Array.prototype.forEach.call(
          thead.querySelectorAll("th"),
          function (th) {
            th.setAttribute("aria-sort", "none");
          }
        );
        if (targetTh) {
          targetTh.setAttribute("aria-sort", currentSortDir === "asc" ? "ascending" : "descending");
        }
      }

      // Attach click handlers for sorting
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

        sortData(currentSortKey, type, currentSortDir);
        updateAriaSort(th);
        renderBody(data);
      });

      // Initial sort: match our “top contracts by total volume” story
      sortData(currentSortKey, "number", currentSortDir);
      updateAriaSort(thead.querySelector('th[data-key="total_volume"]'));
      renderBody(data);

      container.innerHTML = "";
      container.appendChild(table);
    })
    .catch(function (err) {
      console.error("Error loading AAPL options table data", err);
      container.textContent = "Unable to load options data right now.";
    });
})();

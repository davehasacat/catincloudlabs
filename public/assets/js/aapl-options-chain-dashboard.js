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
        container.textContent = "No options data available for the latest trading day.";
        return;
      }

      var table = document.createElement("table");
      table.className = "options-table";

      var thead = document.createElement("thead");
      var headRow = document.createElement("tr");
      var headers = ["Expiry", "Type", "Strike", "Last price", "Volume", "DTE", "Moneyness"];

      headers.forEach(function (label) {
        var th = document.createElement("th");
        th.textContent = label;
        headRow.appendChild(th);
      });

      thead.appendChild(headRow);
      table.appendChild(thead);

      var tbody = document.createElement("tbody");

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

      rows.forEach(function (row) {
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
        addCell(fmtMoney(row.option_close_price));
        addCell(fmtInt(row.option_volume));
        addCell(fmtDte(row.days_to_expiration));
        addCell(fmtMoneyness(row.signed_moneyness_pct)); // <-- updated field

        tbody.appendChild(tr);
      });

      table.appendChild(tbody);

      container.innerHTML = "";
      container.appendChild(table);
    })
    .catch(function (err) {
      console.error("Error loading AAPL options table data", err);
      container.textContent = "Unable to load options data right now.";
    });
})();

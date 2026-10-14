(function () {
  var input = document.getElementById("upload-search");
  if (!input) return;
  var section = input.closest("section");
  var table = section.querySelector("table");
  var rows = Array.prototype.slice.call(table.tBodies[0].rows);
  var groups = [];

  for (var i = 0; i < rows.length; i++) {
    var toggle = rows[i].querySelector("button[aria-expanded]");
    if (!toggle) continue;
    var detail = null;
    var next = rows[i + 1];
    if (next && next.querySelector("td[colspan]")) {
      detail = next;
      i++;
    }
    var pharmacies = [];
    if (detail) {
      var innerRows = detail.querySelectorAll("table tbody tr");
      for (var r = 0; r < innerRows.length; r++) {
        var cells = innerRows[r].cells;
        if (!cells || cells.length < 2) continue;
        var name = cells[0].textContent.trim();
        var npi = cells[1].textContent.trim();
        if (!name || !/^\d+$/.test(npi)) continue;
        pharmacies.push({ name: name.toLowerCase(), npi: npi });
      }
    }
    groups.push({
      row: rows[i] && rows[i] === detail ? rows[i - 1] : rows[i],
      detail: detail,
      toggle: toggle,
      pharmacies: pharmacies,
      originallyOpen: toggle.getAttribute("aria-expanded") === "true"
    });
  }

  groups.forEach(function (group) {
    group.row = group.toggle.closest("tr");
  });

  var footerNums = table.nextElementSibling.querySelectorAll("span.tnum");
  var rangeEl = footerNums[0];
  var totalEl = footerNums[1];
  var originalRange = rangeEl.textContent;
  var originalTotal = totalEl.textContent;

  function setShown(element, show) {
    element.classList.toggle("hidden", !show);
    element.hidden = !show;
  }

  function setOpen(group, open) {
    if (!group.detail) return;
    setShown(group.detail, open);
    group.toggle.setAttribute("aria-expanded", open ? "true" : "false");
    var label = group.toggle.getAttribute("aria-label") || "";
    group.toggle.setAttribute(
      "aria-label",
      open ? label.replace(/^Show results/, "Hide results") : label.replace(/^Hide results/, "Show results")
    );
    var icon = group.toggle.querySelector("svg");
    if (icon) icon.classList.toggle("rotate-90", open);
  }

  function apply() {
    var query = input.value.trim().toLowerCase();
    var visible = 0;
    groups.forEach(function (group) {
      var match = !query || group.pharmacies.some(function (pharmacy) {
        return pharmacy.name.indexOf(query) !== -1 || pharmacy.npi.indexOf(query) !== -1;
      });
      setShown(group.row, match);
      if (!match) {
        if (group.detail) setShown(group.detail, false);
        return;
      }
      visible++;
      setOpen(group, query ? false : group.originallyOpen);
    });
    if (!query) {
      rangeEl.textContent = originalRange;
      totalEl.textContent = originalTotal;
      return;
    }
    rangeEl.textContent = visible > 1 ? "1-" + visible : String(visible);
    totalEl.textContent = visible === 1 ? "1 upload" : visible + " uploads";
  }

  groups.forEach(function (group) {
    group.toggle.addEventListener("click", function () {
      if (!group.detail || group.row.hidden) return;
      setOpen(group, group.toggle.getAttribute("aria-expanded") !== "true");
    });
  });

  input.addEventListener("input", apply);
})();

(function () {
  var PREFIX = "proto2_pd2_";

  function formatDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function readRecord(npi) {
    try {
      var parsed = JSON.parse(localStorage.getItem(PREFIX + npi));
      return parsed && parsed.submittedAt ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function reinstatedCells() {
    return Array.prototype.slice.call(document.querySelectorAll(".js-reinstated-cell"));
  }

  function applyReinstated() {
    reinstatedCells().forEach(function (cell) {
      var row = cell.closest("tr");
      var npi = row && row.cells[1] ? row.cells[1].textContent.trim() : "";
      var record = npi ? readRecord(npi) : null;
      cell.textContent = record ? "Reinstated on " + formatDate(record.submittedAt) : "";
    });
  }

  function clearProto2() {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i));
    keys.forEach(function (key) {
      if (key && key.indexOf("proto2_") === 0) localStorage.removeItem(key);
    });
  }

  var resetBtn = document.getElementById("reset-prototype-data");
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      clearProto2();
      applyReinstated();
    });
  }

  applyReinstated();
})();

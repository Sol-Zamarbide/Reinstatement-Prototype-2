(function () {
  var REQUESTS_KEY = "option2_requests";
  var AUDIT_PREFIX = "option2_audit_";

  var uploadsPanel = document.getElementById("option2-uploads");
  var requestsPanel = document.getElementById("option2-requests");
  var uploadsTab = document.getElementById("option2-tab-uploads");
  var requestsTab = document.getElementById("option2-tab-requests");
  var subtitle = document.getElementById("option2-subtitle");
  var empty = document.getElementById("option2-empty");
  var tableWrap = document.getElementById("option2-table-wrap");
  var tbody = document.getElementById("option2-request-rows");
  var drawer = document.getElementById("option2-drawer");
  var backdrop = document.getElementById("option2-backdrop");
  var approveBtn = document.getElementById("option2-approve");
  var rejectBtn = document.getElementById("option2-reject");
  var notesInput = document.getElementById("option2-decision-notes");
  var notesError = document.getElementById("option2-decision-notes-error");
  var activeId = null;

  function readJson(key, fallback) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key));
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function allRequests() {
    var list = readJson(REQUESTS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function currentUser() {
    var menu = document.querySelector('button[aria-label="User menu"]');
    var named = menu && menu.querySelector(".font-semibold");
    var text = named ? named.textContent.trim() : "";
    return text || "Sol Zamarbide";
  }

  function emailFromName(name) {
    var parts = String(name || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    function slug(part) {
      return part.replace(/[^a-z0-9]/g, "");
    }
    if (!parts.length) return "";
    if (parts.length === 1) return slug(parts[0]) + "@pfizer.com";
    return slug(parts[0]) + "." + slug(parts[parts.length - 1]) + "@pfizer.com";
  }

  function formatSize(bytes) {
    var size = Number(bytes);
    if (!isFinite(size) || size <= 0) return "";
    if (size < 1024) return size + " B";
    if (size < 1048576) {
      var kb = size / 1024;
      return (kb >= 10 ? Math.round(kb) : Math.round(kb * 10) / 10) + " KB";
    }
    var mb = size / 1048576;
    return (mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10) + " MB";
  }

  function formatWhen(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function statusClass(status) {
    if (status === "Approved") return "border-success-border bg-success-soft text-success";
    if (status === "Rejected") return "border-danger-border bg-danger-soft text-danger";
    return "border-warn-border bg-warn-soft text-warn";
  }

  function badge(status) {
    var span = document.createElement("span");
    span.className = "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold " + statusClass(status);
    span.textContent = status;
    return span;
  }

  function findRequest(id) {
    var list = allRequests();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return list[i];
    }
    return null;
  }

  function showTab(which) {
    var uploadsOn = which === "uploads";
    uploadsPanel.hidden = !uploadsOn;
    requestsPanel.hidden = uploadsOn;
    uploadsTab.setAttribute("aria-selected", uploadsOn ? "true" : "false");
    requestsTab.setAttribute("aria-selected", uploadsOn ? "false" : "true");
    if (subtitle) {
      subtitle.textContent = uploadsOn
        ? "Manual pharmacy-list uploads"
        : "Review requests to reinstate terminated pharmacies";
    }
    if (!uploadsOn) renderTable();
  }

  function renderTable() {
    var list = allRequests().slice().sort(function (a, b) {
      return String(b.submittedAt).localeCompare(String(a.submittedAt));
    });
    tbody.textContent = "";
    empty.hidden = list.length > 0;
    tableWrap.hidden = list.length === 0;

    list.forEach(function (item) {
      var row = document.createElement("tr");
      row.className = "border-b border-divider text-[13px] last:border-0";
      if (item.id === activeId) row.classList.add("is-selected");
      row.tabIndex = 0;
      row.setAttribute("data-request-id", item.id);

      function cell(text, className) {
        var td = document.createElement("td");
        td.className = className;
        td.textContent = text;
        return td;
      }

      row.appendChild(cell(item.pharmacyName || "", "py-2.5 pl-5 pr-2 font-semibold text-ink"));
      row.appendChild(cell(item.npi || "", "tnum px-2 py-2.5 font-mono text-[12px] text-ink-2"));
      row.appendChild(cell(item.requesterName || "", "px-2 py-2.5 text-ink-2"));
      row.appendChild(cell(formatWhen(item.submittedAt), "tnum px-2 py-2.5 text-ink-2"));
      var statusCell = document.createElement("td");
      statusCell.className = "py-2.5 pl-2 pr-5";
      statusCell.appendChild(badge(item.status || "Pending review"));
      row.appendChild(statusCell);

      function open() {
        openPanel(item.id);
      }
      row.addEventListener("click", open);
      row.addEventListener("keydown", function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      });
      tbody.appendChild(row);
    });
  }

  function fillDocs(documents) {
    var list = document.getElementById("option2-drawer-docs");
    list.textContent = "";
    var items = (documents || []).map(function (doc) {
      if (typeof doc === "string") return { name: doc, size: null };
      return { name: doc && doc.name ? doc.name : "", size: doc ? doc.size : null };
    }).filter(function (doc) {
      return doc.name;
    });

    if (!items.length) {
      var emptyItem = document.createElement("p");
      emptyItem.className = "option2-docs-empty";
      emptyItem.textContent = "No supporting documents.";
      list.appendChild(emptyItem);
      return;
    }

    items.forEach(function (doc) {
      var row = document.createElement("div");
      row.className = "option2-doc";

      var icon = document.createElement("span");
      icon.className = "option2-doc-icon";
      icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>';

      var main = document.createElement("div");
      main.className = "option2-doc-main";
      var name = document.createElement("div");
      name.className = "option2-doc-name";
      name.textContent = doc.name;
      name.title = doc.name;
      var size = document.createElement("div");
      size.className = "option2-doc-size";
      size.textContent = formatSize(doc.size) || "—";
      main.appendChild(name);
      main.appendChild(size);

      var download = document.createElement("button");
      download.type = "button";
      download.className = "option2-doc-download";
      download.setAttribute("aria-label", "Download " + doc.name);
      download.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 21h14"></path></svg>';

      row.appendChild(icon);
      row.appendChild(main);
      row.appendChild(download);
      list.appendChild(row);
    });
  }

  function openPanel(id) {
    var item = findRequest(id);
    if (!item) return;
    activeId = id;
    document.getElementById("option2-drawer-name").textContent = item.pharmacyName || "";
    document.getElementById("option2-drawer-npi").textContent = item.npi ? "NPI " + item.npi : "";
    var status = document.getElementById("option2-drawer-status");
    status.textContent = "";
    status.appendChild(badge(item.status || "Pending review"));
    document.getElementById("option2-drawer-requester").textContent = item.requesterName || "";
    var email = item.requesterEmail || emailFromName(item.requesterName);
    var emailLink = document.getElementById("option2-drawer-email");
    emailLink.textContent = email;
    emailLink.href = email ? "mailto:" + email : "#";
    document.getElementById("option2-drawer-submitted").textContent = formatWhen(item.submittedAt);
    var justification = item.justification && item.justification.trim()
      ? item.justification
      : "No justification provided.";
    document.getElementById("option2-drawer-justification").textContent = justification;
    fillDocs(item.documents);
    var pending = item.status === "Pending review";
    if (pending) {
      if (notesInput.getAttribute("data-request-id") !== id) notesInput.value = "";
    } else {
      notesInput.value = item.decisionNotes || "";
    }
    notesInput.setAttribute("data-request-id", id);
    notesInput.disabled = !pending;
    showNotesError(false);
    approveBtn.disabled = !pending;
    rejectBtn.disabled = !pending;
    drawer.hidden = false;
    backdrop.hidden = false;
    renderTable();
  }

  function closePanel() {
    activeId = null;
    drawer.hidden = true;
    backdrop.hidden = true;
    renderTable();
  }

  function notesValue() {
    return notesInput.value.replace(/^\s+|\s+$/g, "");
  }

  function showNotesError(show) {
    notesError.hidden = !show;
    notesInput.setAttribute("aria-invalid", show ? "true" : "false");
  }

  function decide(status, title) {
    if (!activeId) return;
    var notes = notesValue();
    if (status === "Rejected" && !notes) {
      showNotesError(true);
      notesInput.focus();
      return;
    }
    var list = allRequests();
    var item = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === activeId) {
        item = list[i];
        break;
      }
    }
    if (!item || item.status !== "Pending review") return;
    var decidedAt = new Date().toISOString();
    var adminName = currentUser();
    item.status = status;
    item.decidedAt = decidedAt;
    item.decidedBy = adminName;
    item.decisionNotes = notes;
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(list));

    var audits = readJson(AUDIT_PREFIX + item.npi, []);
    if (!Array.isArray(audits)) audits = [];
    audits.push({
      title: title,
      timestamp: decidedAt,
      actor: adminName,
      decisionNotes: notes
    });
    localStorage.setItem(AUDIT_PREFIX + item.npi, JSON.stringify(audits));
    showNotesError(false);
    openPanel(item.id);
  }

  document.getElementById("option2-reset").addEventListener("click", function () {
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf("option2_") === 0) keys.push(key);
    }
    keys.forEach(function (key) {
      localStorage.removeItem(key);
    });
    activeId = null;
    drawer.hidden = true;
    backdrop.hidden = true;
    renderTable();
  });

  uploadsTab.addEventListener("click", function () {
    showTab("uploads");
  });
  requestsTab.addEventListener("click", function () {
    showTab("requests");
  });
  document.getElementById("option2-drawer-close").addEventListener("click", closePanel);
  backdrop.addEventListener("click", closePanel);
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !drawer.hidden) closePanel();
  });
  notesInput.addEventListener("input", function () {
    if (notesValue()) showNotesError(false);
  });
  approveBtn.addEventListener("click", function () {
    decide("Approved", "Pharmacy reinstated");
  });
  rejectBtn.addEventListener("click", function () {
    decide("Rejected", "Reinstatement denied");
  });

  window.addEventListener("storage", function (event) {
    if (!event.key || event.key.indexOf("option2_") !== 0) return;
    if (!requestsPanel.hidden) renderTable();
    if (activeId) openPanel(activeId);
  });

  showTab("uploads");
})();

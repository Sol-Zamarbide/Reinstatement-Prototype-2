(function () {
  var REQUESTS_KEY = "option2_requests";
  var AUDIT_PREFIX = "option2_audit_";

  var nameEl = document.getElementById("option2-pharmacy-name");
  var badge = document.getElementById("option2-terminated-badge");
  var button = document.getElementById("option2-reinstate");
  var modal = document.getElementById("option2-modal");
  var modalName = document.getElementById("option2-modal-name");
  var modalNpi = document.getElementById("option2-modal-npi");
  var textarea = document.getElementById("option2-justification");
  var drop = document.getElementById("option2-drop");
  var fileInput = document.getElementById("option2-file-input");
  var fileNames = document.getElementById("option2-file-names");
  var stagedFiles = [];

  function readJson(key, fallback) {
    try {
      var parsed = JSON.parse(localStorage.getItem(key));
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function pharmacyNpi() {
    var npiButton = document.querySelector('button[title="Copy NPI"]');
    var match = npiButton && npiButton.textContent.match(/(\d{10})/);
    return match ? match[1] : "";
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

  var npi = pharmacyNpi();
  var pharmacyName = nameEl ? nameEl.textContent.trim() : "";

  function allRequests() {
    var list = readJson(REQUESTS_KEY, []);
    return Array.isArray(list) ? list : [];
  }

  function latestRequest() {
    var mine = allRequests().filter(function (item) {
      return item && item.npi === npi;
    });
    mine.sort(function (a, b) {
      return String(a.submittedAt).localeCompare(String(b.submittedAt));
    });
    return mine.length ? mine[mine.length - 1] : null;
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

  function renderAudit() {
    var heading = null;
    var headings = document.querySelectorAll("h3");
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].textContent.trim() === "Audit trail") {
        heading = headings[i];
        break;
      }
    }
    if (!heading) return;
    var details = heading.closest("details");
    var list = details && details.querySelector("ol");
    if (!list) return;

    var previous = list.querySelectorAll("[data-option2-audit]");
    for (var j = 0; j < previous.length; j++) previous[j].remove();

    var entries = readJson(AUDIT_PREFIX + npi, []);
    if (!Array.isArray(entries)) entries = [];

    var count = heading.nextElementSibling;
    if (count) {
      var base = parseInt(count.getAttribute("data-option2-base"), 10);
      if (isNaN(base)) {
        base = parseInt(count.textContent, 10) || 0;
        count.setAttribute("data-option2-base", String(base));
      }
      count.textContent = String(base + entries.length);
    }

    entries.forEach(function (entry) {
      var item = document.createElement("li");
      item.className = "text-[12.5px]";
      item.setAttribute("data-option2-audit", "1");

      var when = document.createElement("div");
      when.className = "flex items-center gap-2";
      var time = document.createElement("span");
      time.className = "tnum font-mono text-[11px] text-ink-4";
      time.textContent = formatWhen(entry.timestamp);
      when.appendChild(time);

      var action = document.createElement("div");
      action.className = "mt-0.5";
      var actor = document.createElement("span");
      actor.className = "font-semibold text-ink";
      actor.textContent = entry.actor || "Signal Detection";
      var sep = document.createElement("span");
      sep.className = "text-ink-2";
      sep.textContent = " — ";
      var notes = entry.decisionNotes && String(entry.decisionNotes).trim()
        ? String(entry.decisionNotes).trim()
        : "";
      var what = document.createElement("span");
      what.className = "text-ink-2";
      if (entry.title === "Reinstatement denied" && notes) {
        what.textContent = "Reinstatement denied: " + notes;
      } else {
        what.textContent = entry.title || "";
      }
      action.appendChild(actor);
      action.appendChild(sep);
      action.appendChild(what);

      item.appendChild(when);
      item.appendChild(action);

      if (entry.title === "Reinstatement requested") {
        var note = document.createElement("div");
        note.className = "mt-0.5 text-ink-3";
        note.textContent = entry.justification && entry.justification.trim()
          ? entry.justification
          : "No justification provided.";
        item.appendChild(note);
      } else if (entry.title === "Pharmacy reinstated" && notes) {
        var decision = document.createElement("div");
        decision.className = "mt-0.5 text-ink-3";
        decision.textContent = notes;
        item.appendChild(decision);
      }

      list.insertBefore(item, list.firstChild);
    });
  }

  function appendAudit(entry) {
    var entries = readJson(AUDIT_PREFIX + npi, []);
    if (!Array.isArray(entries)) entries = [];
    entries.push(entry);
    localStorage.setItem(AUDIT_PREFIX + npi, JSON.stringify(entries));
    renderAudit();
  }

  function applyStatus() {
    var latest = latestRequest();
    if (latest && latest.status === "Approved") {
      if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
      if (button && button.parentNode) button.parentNode.removeChild(button);
      button = null;
      badge = null;
      return;
    }
    if (!badge) {
      if (button && button.parentNode) button.parentNode.removeChild(button);
      button = null;
      return;
    }
    if (!button) return;
    if (latest && latest.status === "Pending review") {
      button.disabled = true;
      button.textContent = "Reinstatement requested";
    } else {
      button.disabled = false;
      button.textContent = "Reinstate pharmacy";
    }
  }

  function showFileNames() {
    fileNames.textContent = stagedFiles.length
      ? stagedFiles.map(function (file) { return file.name; }).join(", ")
      : "";
  }

  function addNames(files) {
    if (!files || !files.length) return;
    for (var i = 0; i < files.length; i++) {
      var already = stagedFiles.some(function (file) { return file.name === files[i].name; });
      if (!already) stagedFiles.push({ name: files[i].name, size: files[i].size || 0 });
    }
    showFileNames();
  }

  function resetForm() {
    textarea.value = "";
    stagedFiles = [];
    fileInput.value = "";
    showFileNames();
    drop.classList.remove("option2-drag");
  }

  var actionsToggle = document.getElementById("option2-actions-toggle");
  var actionsMenu = document.getElementById("option2-actions-menu");
  var actionsRoot = document.getElementById("option2-actions");

  function setMenuOpen(open) {
    if (!actionsMenu || !actionsToggle) return;
    actionsMenu.hidden = !open;
    actionsToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function openModal() {
    if (!button || button.disabled) return;
    setMenuOpen(false);
    modalName.textContent = pharmacyName;
    modalNpi.textContent = npi ? "NPI " + npi : "";
    resetForm();
    modal.hidden = false;
    textarea.focus();
  }

  function closeModal() {
    modal.hidden = true;
    resetForm();
  }

  function submitRequest() {
    var submittedAt = new Date().toISOString();
    var justification = textarea.value;
    var requesterName = currentUser();
    var requests = allRequests();
    requests.push({
      id: "option2_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      pharmacyName: pharmacyName,
      npi: npi,
      requesterName: requesterName,
      requesterEmail: emailFromName(requesterName),
      justification: justification,
      documents: stagedFiles.map(function (file) {
        return { name: file.name, size: file.size };
      }),
      submittedAt: submittedAt,
      status: "Pending review",
      decidedAt: null
    });
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    appendAudit({
      title: "Reinstatement requested",
      timestamp: submittedAt,
      actor: currentUser(),
      justification: justification
    });
    closeModal();
    applyStatus();
  }

  if (button) button.addEventListener("click", openModal);
  if (actionsToggle) {
    actionsToggle.addEventListener("click", function () {
      setMenuOpen(actionsMenu.hidden);
    });
  }
  if (actionsMenu) {
    actionsMenu.addEventListener("click", function (event) {
      var item = event.target.closest("[role='menuitem']");
      if (!item || item.disabled) return;
      setMenuOpen(false);
    });
  }
  document.addEventListener("click", function (event) {
    if (!actionsMenu || actionsMenu.hidden) return;
    if (actionsRoot && actionsRoot.contains(event.target)) return;
    setMenuOpen(false);
  });
  document.getElementById("option2-cancel").addEventListener("click", closeModal);
  document.getElementById("option2-close").addEventListener("click", closeModal);
  document.getElementById("option2-request").addEventListener("click", submitRequest);

  modal.addEventListener("click", function (event) {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    if (!modal.hidden) closeModal();
    else setMenuOpen(false);
  });

  drop.addEventListener("click", function () {
    fileInput.click();
  });
  fileInput.addEventListener("click", function (event) {
    event.stopPropagation();
  });
  fileInput.addEventListener("change", function () {
    addNames(fileInput.files);
    fileInput.value = "";
  });
  ["dragenter", "dragover"].forEach(function (type) {
    drop.addEventListener(type, function (event) {
      event.preventDefault();
      drop.classList.add("option2-drag");
    });
  });
  drop.addEventListener("dragleave", function (event) {
    event.preventDefault();
    drop.classList.remove("option2-drag");
  });
  drop.addEventListener("drop", function (event) {
    event.preventDefault();
    drop.classList.remove("option2-drag");
    addNames(event.dataTransfer && event.dataTransfer.files);
  });

  applyStatus();
  renderAudit();
})();

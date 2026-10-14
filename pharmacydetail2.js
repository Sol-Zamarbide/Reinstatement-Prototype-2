(function () {
  var CURRENT_USER = "Sol Zamarbide";

  var nameEl = document.getElementById("pd2-pharmacy-name");
  var badge = document.getElementById("pd2-terminated");
  var pill = document.getElementById("pd2-reinstated");
  var watch = document.getElementById("pd2-watch");
  var watched = document.getElementById("pd2-watched");
  var watchedValue = document.getElementById("pd2-watched-value");
  var button = document.getElementById("option2-reinstate");
  var modal = document.getElementById("option2-modal");
  var modalName = document.getElementById("option2-modal-name");
  var modalNpi = document.getElementById("option2-modal-npi");
  var textarea = document.getElementById("option2-justification");
  var drop = document.getElementById("option2-drop");
  var fileInput = document.getElementById("option2-file-input");
  var fileNames = document.getElementById("option2-file-names");
  var stagedFiles = [];

  function pharmacyNpi() {
    var npiButton = document.querySelector('button[title="Copy NPI"]');
    var match = npiButton && npiButton.textContent.match(/(\d{10})/);
    return match ? match[1] : "";
  }

  function currentUser() {
    var menu = document.querySelector('button[aria-label="User menu"]');
    var named = menu && menu.querySelector(".font-semibold");
    var text = named ? named.textContent.trim() : "";
    return text || CURRENT_USER;
  }

  function readRecord() {
    try {
      var parsed = JSON.parse(localStorage.getItem(storageKey()));
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  var npi = pharmacyNpi();
  var pharmacyName = nameEl ? nameEl.textContent.trim() : "";

  function storageKey() {
    return "proto2_pd2_" + (npi || "unknown");
  }

  function formatDateTime(iso) {
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

  function formatDate(iso) {
    var date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  }

  function renderAudit(record) {
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

    var previous = list.querySelectorAll("[data-pd2-audit]");
    for (var j = 0; j < previous.length; j++) previous[j].remove();

    var count = heading.nextElementSibling;
    if (count) {
      var base = parseInt(count.getAttribute("data-pd2-base"), 10);
      if (isNaN(base)) {
        base = parseInt(count.textContent, 10) || 0;
        count.setAttribute("data-pd2-base", String(base));
      }
      count.textContent = String(base + (record ? 1 : 0));
    }
    if (!record) return;

    var whenText = formatDateTime(record.submittedAt);
    var justification = record.justification && String(record.justification).trim()
      ? String(record.justification).trim()
      : "No justification provided.";
    var submitter = record.submitterName || CURRENT_USER;

    var item = document.createElement("li");
    item.className = "text-[12.5px]";
    item.setAttribute("data-pd2-audit", "1");

    var when = document.createElement("div");
    when.className = "flex items-center gap-2";
    var time = document.createElement("span");
    time.className = "tnum font-mono text-[11px] text-ink-4";
    time.textContent = whenText;
    when.appendChild(time);

    var action = document.createElement("div");
    action.className = "mt-0.5";
    var actor = document.createElement("span");
    actor.className = "font-semibold text-ink";
    actor.textContent = submitter;
    var sep = document.createElement("span");
    sep.className = "text-ink-2";
    sep.textContent = " — ";
    var what = document.createElement("span");
    what.className = "text-ink-2";
    what.textContent = "Reinstatement submitted - " + submitter + ", " + justification + ", " + whenText;
    action.appendChild(actor);
    action.appendChild(sep);
    action.appendChild(what);

    item.appendChild(when);
    item.appendChild(action);
    list.insertBefore(item, list.firstChild);
  }

  function fillStar() {
    if (!watch) return;
    watch.setAttribute("aria-pressed", "true");
    watch.setAttribute("aria-label", "On watch list");
    watch.title = "On watch list";
    watch.classList.remove("text-ink-4");
    watch.classList.add("text-accent");
    var star = watch.querySelector("svg");
    if (star) star.setAttribute("fill", "currentColor");
  }

  function applyRecord(record) {
    if (!record) {
      renderAudit(null);
      return;
    }
    if (badge && badge.parentNode) badge.parentNode.removeChild(badge);
    badge = null;
    if (pill) pill.hidden = false;
    if (button) {
      button.disabled = true;
      button.textContent = "Reinstatement submitted";
    }
    fillStar();
    if (watched && watchedValue) {
      watchedValue.textContent = "since " + formatDate(record.submittedAt);
      watched.hidden = false;
    }
    renderAudit(record);
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
    if (!button || button.disabled) return;
    var submittedAt = new Date().toISOString();
    var record = {
      npi: npi,
      submitterName: currentUser(),
      justification: textarea.value,
      submittedAt: submittedAt
    };
    localStorage.setItem(storageKey(), JSON.stringify(record));
    closeModal();
    applyRecord(record);
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
      window.location.reload();
    });
  }

  applyRecord(readRecord());
})();

  // ===== command palette (spotlight) =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  var slFiltered = [];
  var slActive = 0;

  function spotlightOpen() { return !els.spotlight.hidden; }

  function ctrlKbds(keys) {
    return keys.map(function (k) { return "<kbd>" + esc(k) + "</kbd>"; }).join("");
  }

  // Flatten the guide into palette actions: Full diff, each group, each file.
  function buildActions() {
    var acts = [];
    if (changesAvailable) {
      acts.push({
        kind: "action", glyph: "⟳", label: "Show new changes",
        sub: "reload difit + guide in place (keeps your comment)",
        hint: null,
        keywords: "show new changes reload refresh diff update latest",
        run: showNewChanges,
      });
    }
    // Collapse / expand the guide sidebar (label follows the current state).
    var collapsed = els.body.classList.contains("collapsed");
    acts.push({
      kind: "action", glyph: collapsed ? "»" : "«",
      label: (collapsed ? "Expand" : "Collapse") + " diff guide",
      sub: (collapsed ? "show" : "hide") + " the guide sidebar",
      hint: ["Ctrl", "H"],
      keywords: "collapse expand toggle diff guide sidebar panel show hide",
      run: function () { els.body.classList.toggle("collapsed"); },
    });
    acts.push({
      kind: "view", glyph: "≡", label: "Full diff",
      sub: "all " + totalFiles() + " files",
      hint: ["Ctrl", "F"],
      keywords: "full diff all files overview everything",
      run: function () { selectView("full"); },
    });
    var newFiles = newFilePaths();
    if (newFiles.length) {
      acts.push({
        kind: "view", glyph: "+", label: "New files not in guide",
        sub: newFiles.length + " files not in any group",
        hint: null,
        keywords: "new files not in guide ungrouped missing " + newFiles.join(" "),
        run: function () { selectView("new"); },
      });
    }
    groups.forEach(function (g) {
      var gfiles = g.files || [];
      acts.push({
        kind: "group", num: g.n, mk: kindColor(g.kind),
        label: "Group " + pad(g.n) + (g.name ? " — " + g.name : ""),
        sub: (g.ticket ? g.ticket + " · " : "") + gfiles.length + " files",
        hint: g.n <= 9 ? ["Ctrl", String(g.n)] : null,
        keywords: (g.name || "") + " " + (g.ticket || "") + " " + (g.kind || "") + " group " + g.n,
        run: (function (n) { return function () { selectView("g" + n); }; })(g.n),
      });
      gfiles.forEach(function (f) {
        acts.push({
          kind: "file", glyph: "↳",
          label: baseName(f.path),
          sub: f.path + " · Group " + g.n,
          hint: null,
          keywords: f.path + " " + (f.tag || "") + " " + (g.name || ""),
          run: (function (n, p) { return function () { selectFile("g" + n, p); }; })(g.n, f.path),
        });
      });
    });
    return acts;
  }

  // Filter rule: a bare number filters straight to that group's command
  // (per the reviewer's request); otherwise every space-separated token must
  // appear in the action's label/sub/keywords.
  function filterActions(query) {
    var acts = buildActions();
    var q = query.trim().toLowerCase();
    if (!q) return acts;
    if (/^\d+$/.test(q)) {
      var n = parseInt(q, 10);
      return acts.filter(function (a) { return a.kind === "group" && a.num === n; });
    }
    var toks = q.split(/\s+/);
    var hit = acts.filter(function (a) {
      var hay = (a.label + " " + (a.sub || "") + " " + (a.keywords || "")).toLowerCase();
      return toks.every(function (t) { return hay.indexOf(t) !== -1; });
    });
    // Light rank: label-prefix matches float to the top, order otherwise kept.
    var first = toks[0];
    hit.sort(function (a, b) {
      var ap = a.label.toLowerCase().indexOf(first) === 0 ? 0 : 1;
      var bp = b.label.toLowerCase().indexOf(first) === 0 ? 0 : 1;
      return ap - bp;
    });
    return hit;
  }

  function renderSpotlight() {
    slFiltered = filterActions(els.slInput.value);
    if (slActive >= slFiltered.length) slActive = Math.max(0, slFiltered.length - 1);
    if (!slFiltered.length) {
      els.slList.innerHTML = '<div class="sl-empty">No matches</div>';
      return;
    }
    var lastKind = null;
    var h = "";
    slFiltered.forEach(function (a, i) {
      if (a.kind !== lastKind) {
        var sec = a.kind === "action" ? "Actions" : a.kind === "view" ? "Views" : a.kind === "group" ? "Groups" : "Files";
        h += '<div class="sl-sec">' + sec + "</div>";
        lastKind = a.kind;
      }
      var glyph = a.mk
        ? '<span class="sl-mk" style="background:' + a.mk + '"></span>'
        : '<span class="sl-glyph">' + esc(a.glyph || "·") + "</span>";
      h += '<button class="sl-item ' + (i === slActive ? "active" : "") + '" data-idx="' + i + '" role="option">'
        + glyph
        + '<span class="sl-txt"><span class="sl-lbl">' + esc(a.label) + "</span>"
        + (a.sub ? '<span class="sl-sub">' + esc(a.sub) + "</span>" : "")
        + "</span>"
        + (a.hint ? '<span class="sl-hint">' + ctrlKbds(a.hint) + "</span>" : "")
        + "</button>";
    });
    els.slList.innerHTML = h;
    Array.prototype.forEach.call(els.slList.querySelectorAll(".sl-item"), function (n) {
      n.addEventListener("click", function () { runAction(parseInt(n.getAttribute("data-idx"), 10)); });
      n.addEventListener("mousemove", function () {
        var idx = parseInt(n.getAttribute("data-idx"), 10);
        if (idx !== slActive) { slActive = idx; paintActive(); }
      });
    });
  }

  function paintActive() {
    Array.prototype.forEach.call(els.slList.querySelectorAll(".sl-item"), function (n) {
      var on = parseInt(n.getAttribute("data-idx"), 10) === slActive;
      n.classList.toggle("active", on);
      if (on) n.scrollIntoView({ block: "nearest" });
    });
  }

  function moveActive(delta) {
    if (!slFiltered.length) return;
    slActive = (slActive + delta + slFiltered.length) % slFiltered.length;
    paintActive();
  }

  function runAction(idx) {
    var a = slFiltered[idx];
    closeSpotlight();
    if (a && typeof a.run === "function") a.run();
  }

  function openSpotlight() {
    els.spotlight.hidden = false;
    els.slInput.value = "";
    slActive = 0;
    renderSpotlight();
    els.slInput.focus();
  }
  function closeSpotlight() {
    els.spotlight.hidden = true;
  }
  function toggleSpotlight() {
    if (spotlightOpen()) closeSpotlight(); else openSpotlight();
  }

  els.cmdBtn.addEventListener("click", openSpotlight);
  els.slBackdrop.addEventListener("click", closeSpotlight);
  els.slInput.addEventListener("input", function () { slActive = 0; renderSpotlight(); });

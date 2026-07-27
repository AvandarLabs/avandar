  // ===== hotkeys + cross-frame message + storage listeners =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // Mod = Cmd on macOS (Ctrl there switches nothing at the browser level),
  // Ctrl elsewhere. Cmd+digit is the browser's tab switch on macOS, so groups
  // use Ctrl there without clashing.
  function modKey(e) { return IS_MAC ? e.metaKey : e.ctrlKey; }

  function isSpotlightCombo(e) {
    return modKey(e) && !e.altKey && (e.key === "k" || e.key === "K");
  }

  function navLeader(e) {
    if (IS_MAC) return e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey;
    return e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey;
  }

  function platformHotkeyLabel(key) {
    return IS_MAC ? "Ctrl+" + key : "Alt+Shift+" + key;
  }

  // A platform navigation combo -> a nav intent, or null.
  function navCombo(e) {
    if (!navLeader(e)) return null;
    if (/^Digit[1-9]$/.test(e.code)) return { type: "group", n: parseInt(e.code.slice(5), 10) };
    if (e.key === "f" || e.key === "F") return { type: "full" };
    if (e.key === "h" || e.key === "H") return { type: "toggle-side" };
    if (e.key === "d" || e.key === "D") return { type: "guide-tab" };
    if (e.key === "t" || e.key === "T") return { type: "test-plan-tab" };
    return null;
  }

  function isEditableTarget(t) {
    if (!t) return false;
    var tag = (t.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable === true;
  }

  function dispatchNav(c) {
    if (!c) return;
    if (c.type === "full") selectView("full");
    else if (c.type === "spotlight") toggleSpotlight();
    else if (c.type === "toggle-side") els.body.classList.toggle("collapsed");
    else if (c.type === "guide-tab") { sideMode = "guide"; renderAll(); }
    else if (c.type === "test-plan-tab") { sideMode = "test-plan"; renderAll(); }
    else if (c.type === "group" && groupExists(c.n)) selectView("g" + c.n);
  }

  function onGlobalKey(e) {
    if (spotlightOpen()) {
      if (e.key === "Escape") { e.preventDefault(); closeSpotlight(); }
      else if (e.key === "ArrowDown") { e.preventDefault(); moveActive(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); moveActive(-1); }
      else if (e.key === "Enter") { e.preventDefault(); runAction(slActive); }
      else if (isSpotlightCombo(e)) { e.preventDefault(); closeSpotlight(); }
      return;
    }
    if (isSpotlightCombo(e)) { e.preventDefault(); openSpotlight(); return; }
    if (isEditableTarget(e.target)) return; // never steal keys while typing
    var c = navCombo(e);
    if (c) { e.preventDefault(); dispatchNav(c); }
  }
  window.addEventListener("keydown", onGlobalKey);

  // Sidebar roving focus: Up/Down move between the guide's nav buttons.
  els.sideScroll.addEventListener("keydown", function (e) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    var items = Array.prototype.slice.call(els.sideScroll.querySelectorAll("[data-view]"));
    var idx = items.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    var next = e.key === "ArrowDown" ? Math.min(items.length - 1, idx + 1) : Math.max(0, idx - 1);
    if (items[next]) items[next].focus();
  });

  // difit lives in a same-origin iframe; a keydown there never reaches this
  // document, so inject.js forwards matching hotkeys (and the ready signal).
  window.addEventListener("message", function (e) {
    if (e.origin !== window.location.origin) return;
    var d = e.data;
    if (!d || d.source !== "dif-web-shell") return;
    if (d.type === "difit-ready") { onDifitReady(); return; }
    // difit says its file-watcher fired — could be a real edit or git-internal
    // noise. Re-fetch the diff and let the CONTENT comparison decide.
    if (d.type === "changes-available") { fetchDiff(); return; }
    // The user clicked difit's OWN reload button in the iframe: difit reloads in
    // place (no iframe reload → no `difit-ready`), so mirror what "Show new
    // changes" does — rebaseline to difit's freshly-loaded diff and refresh the
    // guide + counts so the shell stays in sync and the affordance clears.
    if (d.type === "difit-reloaded") {
      baselineUntil = nowMs() + 1500;
      fetchGroups();
      fetchDiff();
      return;
    }
    if (d.type === "hotkey" && d.combo) {
      if (d.combo.type === "spotlight") toggleSpotlight();
      else dispatchNav(d.combo);
    }
  });

  // difit (in the iframe) writing its viewed index fires a `storage` event in
  // THIS parent document — that's how we mirror difit's viewed state live.
  window.addEventListener("storage", function (e) {
    if (e.key && e.key.lastIndexOf(VIEWED_PREFIX, 0) !== 0) return; // unrelated key
    readLiveViewed();
    renderAll();
  });

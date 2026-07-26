  // ===== chrome: collapse, retry, regenerate, show-new-changes, theme =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  document.getElementById("toggleSide").addEventListener("click", function () { els.body.classList.toggle("collapsed"); });
  document.getElementById("collapseBtn").addEventListener("click", function () { els.body.classList.add("collapsed"); });
  if (els.ifrRetry) els.ifrRetry.addEventListener("click", function () { attempts = 0; selectView(view); });

  // Refresh diff guide: POST to the shell, which flags the TUI to run the
  // /diff-review skill. Claude rewrites the guide.json; our 3s poll picks it up
  // (`applyGroups`) and clears the in-flight state. The button stays DISABLED
  // for the whole time Claude is working, so a second click can't queue another
  // regeneration. A long fallback re-arms it if the guide never changes.
  var regenFallbackTimer = null;
  function endRegenInFlight() {
    regenInFlight = false;
    window.clearTimeout(regenFallbackTimer);
    if (els.regenBtn) els.regenBtn.classList.remove("busy");
    updateRegenBtn();
  }
  function regenerateGuide() {
    if (!els.regenBtn || regenInFlight) return;
    regenInFlight = true;
    els.regenBtn.classList.add("busy");
    els.regenBtn.disabled = true;
    window.clearTimeout(regenFallbackTimer);
    regenFallbackTimer = window.setTimeout(endRegenInFlight, 180000); // safety net
    fetch("/__wrap/regenerate", { method: "POST" })
      .then(function (r) { if (!r.ok) throw new Error("regenerate " + r.status); })
      .catch(endRegenInFlight); // request failed → let them try again
  }
  if (els.regenBtn) els.regenBtn.addEventListener("click", regenerateGuide);

  // "Show new changes": difit told us the working tree changed. Trigger difit's
  // OWN in-place reload (via inject.js) — no iframe reload, so an in-progress
  // comment survives — and refresh our guide + counts to match.
  function setChangesAvailable(avail) {
    changesAvailable = avail;
    if (els.showChangesBtn) els.showChangesBtn.hidden = !avail;
    if (spotlightOpen()) renderSpotlight(); // add/remove the palette action
  }
  // Instant: reload difit's diff in place and refresh the guide + counts. This
  // is not a "process" (no Claude, no server restart) — it just shows the newest
  // code + newest guide. difit's in-place reload does NOT reload the iframe (so
  // an in-progress comment survives), which means it won't fire `onDifitReady`,
  // so we baseline `renderedDiffSig` here to the live diff difit is about to show.
  function showNewChanges() {
    if (!changesAvailable) return;
    renderedDiffSig = liveDiffSig;     // difit is reloading to exactly this diff
    baselineUntil = nowMs() + 1500;    // absorb difit's reload settle
    setChangesAvailable(false);
    postToDifit({ type: "reload-difit" }); // difit reloads its diff in place
    fetchGroups();
    fetchDiff();
  }
  if (els.showChangesBtn) els.showChangesBtn.addEventListener("click", showNewChanges);

  function applyTheme(t) {
    if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t);
  }
  document.getElementById("themeBtn").addEventListener("click", function () {
    var cur = document.documentElement.getAttribute("data-theme")
      || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var next = cur === "dark" ? "light" : "dark";
    applyTheme(next);
    try { window.localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignore */ }
  });

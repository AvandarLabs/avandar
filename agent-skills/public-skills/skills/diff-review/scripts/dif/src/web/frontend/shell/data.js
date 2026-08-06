  // ===== data: guide (groups.json), header meta, authoritative diff =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.

  // ---- data: load + live-poll the guide ----
  function applyGroups(text) {
    if (text === lastGroupsJson) return;
    lastGroupsJson = text;
    // The guide changed on disk → a regeneration completed. Clear the in-flight
    // lock so "Refresh diff guide" re-enables (and hides if all files now match).
    if (regenInFlight) endRegenInFlight();
    try { groups = JSON.parse(text) || []; } catch (e) { groups = []; }
    if (!Array.isArray(groups)) groups = [];
    // If the current group vanished from a regenerated guide, fall back to Full.
    // (The "new" view survives — it isn't a group — and is dropped only when
    // there are no more ungrouped files, handled on the next diff refresh.)
    if (view !== "full" && view !== "new" && !groupByView()) selectView("full");
    else renderAll();
  }
  function fetchGroups() {
    fetch("/__wrap/groups.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error("groups " + r.status)); })
      .then(applyGroups)
      .catch(function () { /* keep last known guide */ });
  }

  function applySummary(text) {
    if (text === lastSummaryText) return;
    lastSummaryText = text;
    diffSummary = text.trim();
    renderAll();
  }
  function fetchSummary() {
    fetch("/__wrap/diff-summary.md", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error("summary " + r.status)); })
      .then(applySummary)
      .catch(function () { /* keep last known summary */ });
  }
  function applyTestPlan(text) {
    if (text === lastTestPlanText) return;
    lastTestPlanText = text;
    testPlan = text;
    renderAll();
  }
  function fetchTestPlan() {
    fetch("/__wrap/test-plan.md", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(new Error("test-plan " + r.status)); })
      .then(applyTestPlan)
      .catch(function () { /* keep last known test plan */ });
  }

  // ---- data: header identity (branch + worktree pill) ----
  function applyMeta(meta) {
    if (!meta || typeof meta !== "object") return;
    if (meta.branch) {
      els.brandTitle.textContent = meta.branch;
      els.brandTitle.title = meta.branch;
    }
    if (meta.showWorktree && meta.worktree) {
      els.worktreePill.textContent = meta.worktree;
      els.worktreePill.hidden = false;
    } else {
      els.worktreePill.hidden = true;
    }
  }
  function fetchMeta() {
    fetch("/__wrap/meta.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("meta " + r.status)); })
      .then(applyMeta)
      .catch(function () { /* keep the default title */ });
  }

  // ---- data: the authoritative diff (difit's real /api/diff, unfiltered) ----
  // This parent document's fetch carries no `?group=`/`?view=` referer, so the
  // proxy returns the full, unfiltered diff — the true current file set.
  // A small, stable hash of the diff's actual CONTENT — path, status, and the
  // hunks — so we can tell a real change from difit's git-internal reload noise.
  // Deliberately excludes `isGenerated` (difit may compute it lazily, so it can
  // flip during warmup) and the derived add/del counts.
  function hashStr(s) {
    var h = 5381, i = s.length;
    while (i) h = (h * 33) ^ s.charCodeAt(--i);
    return (h >>> 0).toString(16);
  }
  function diffSig(files) {
    try {
      return hashStr(JSON.stringify(files.map(function (f) {
        return [f.path, f.oldPath || "", f.status, f.chunks];
      })));
    } catch (e) { return "?"; }
  }
  function nowMs() { return (window.performance && performance.now) ? performance.now() : +new Date(); }

  function applyDiff(json) {
    var files = json && json.files;
    if (!Array.isArray(files)) return;
    var paths = [];
    var auto = {};
    files.forEach(function (f) {
      if (!f || !f.path) return;
      paths.push(f.path);
      // Mirror difit's auto-view: generated files and deletions need no review.
      if (f.isGenerated === true || f.status === "deleted") auto[f.path] = true;
    });
    var changed = paths.length !== diffPaths.length || paths.some(function (p, i) { return p !== diffPaths[i]; });
    diffPaths = paths;
    autoViewed = auto;
    diffLoaded = true;

    // Content-based "Show new changes": keep baselining to what difit is showing
    // during the settle window, else flag when the live diff diverges from it.
    liveDiffSig = diffSig(files);
    if (renderedDiffSig === null || nowMs() < baselineUntil) {
      renderedDiffSig = liveDiffSig;
    }
    setChangesAvailable(liveDiffSig !== renderedDiffSig);

    // If we're on the "new files" view and nothing is ungrouped anymore (the
    // guide was regenerated to cover them), fall back to Full.
    if (view === "new" && !newFilePaths().length) { selectView("full"); return; }
    if (changed) renderAll(); // counts / new-files bar may have shifted
  }
  function fetchDiff() {
    fetch("/api/diff", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("diff " + r.status)); })
      .then(applyDiff)
      .catch(function () { /* keep last known diff */ });
  }

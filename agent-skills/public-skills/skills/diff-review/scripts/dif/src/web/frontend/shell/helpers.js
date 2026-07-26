  // ===== pure helpers + derived state + the live viewed mirror =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  function allFiles() {
    return groups.reduce(function (acc, g) { return acc.concat(g.files || []); }, []);
  }
  function groupByView() {
    if (view === "full") return null;
    var n = parseInt(view.slice(1), 10);
    return groups.find(function (g) { return g.n === n; }) || null;
  }
  function groupExists(n) {
    return groups.some(function (g) { return g.n === n; });
  }
  // Every path the guide covers (across all groups).
  function guideFileSet() {
    var set = {};
    groups.forEach(function (g) { (g.files || []).forEach(function (f) { set[f.path] = true; }); });
    return set;
  }
  // Files present in difit's real diff but in no guide group.
  function newFilePaths() {
    if (!diffLoaded) return [];
    var inGuide = guideFileSet();
    return diffPaths.filter(function (p) { return !inGuide[p]; });
  }
  // The guide is stale iff its FILE LIST differs from difit's real diff — a file
  // was added (in the diff, not the guide) or removed (in the guide, not the
  // diff). Content edits to files already in the guide do NOT count: the guide
  // still lists the same files. Drives the "Regenerate" button's visibility.
  function guideFileListDiffers() {
    if (!diffLoaded || !groups.length) return false; // no data / no guide yet
    var inGuide = guideFileSet();
    // any diff file missing from the guide?
    if (diffPaths.some(function (p) { return !inGuide[p]; })) return true;
    // any guide file no longer in the diff?
    var inDiff = {};
    diffPaths.forEach(function (p) { inDiff[p] = true; });
    return Object.keys(inGuide).some(function (p) { return !inDiff[p]; });
  }
  // Authoritative total file count: difit's real diff once known, else the guide.
  function totalFiles() {
    return diffLoaded ? diffPaths.length : allFiles().length;
  }
  // How many of the real diff's files difit currently marks viewed.
  function reviewedTotal() {
    if (!diffLoaded) return allFiles().filter(reviewedLive).length;
    return diffPaths.filter(isViewedPath).length;
  }
  function kindColor(kind) {
    return kind === "bug" ? "var(--del)" : "var(--accent)";
  }
  function baseName(path) {
    var i = path.lastIndexOf("/");
    return i < 0 ? path : path.slice(i + 1);
  }
  // A path is "viewed" the way difit counts it: an explicit viewed mark in
  // difit's localStorage, or difit's auto-view of a generated/deleted file.
  function isViewedPath(p) { return liveViewed[p] === true || autoViewed[p] === true; }
  // A file counts as reviewed if difit views it (live or auto) or the skill
  // recorded it reviewed in the guide. "changed" only shows when neither.
  function reviewedLive(f) { return isViewedPath(f.path) || f.status === "reviewed"; }
  function isChangedOnly(f) { return f.status === "changed" && !reviewedLive(f); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function checkSvg(f) {
    if (reviewedLive(f)) {
      return '<svg class="check" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--ok-wash)" stroke="var(--ok)" stroke-width="1.2"/><path d="M5 8.2l2 2 4-4.4" stroke="var(--ok)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if (isChangedOnly(f)) {
      return '<svg class="check" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="var(--warn-wash)" stroke="var(--warn)" stroke-width="1.2"/><path d="M8 4.6v4.2M8 11.1v0.1" stroke="var(--warn)" stroke-width="1.6" stroke-linecap="round"/></svg>';
    }
    return '<svg class="check" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="7" stroke="var(--ink-3)" stroke-width="1.1" stroke-dasharray="2.2 2.2" opacity="0.7"/></svg>';
  }

  // ---- live viewed mirror (from difit's localStorage) ----
  function readLiveViewed() {
    var set = {};
    try {
      for (var i = 0; i < window.localStorage.length; i++) {
        var key = window.localStorage.key(i);
        if (!key || key.lastIndexOf(VIEWED_PREFIX, 0) !== 0) continue;
        var raw = window.localStorage.getItem(key);
        if (!raw) continue;
        var idx;
        try { idx = JSON.parse(raw); } catch (e) { continue; }
        var entries = idx && idx.entries;
        if (Array.isArray(entries)) {
          entries.forEach(function (en) { if (en && en.filePath) set[en.filePath] = true; });
        } else if (entries && typeof entries === "object") {
          Object.keys(entries).forEach(function (k) { set[k] = true; });
        }
      }
    } catch (e) { /* localStorage unavailable */ }
    liveViewed = set;
  }

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
  function copyIconSvg() {
    return '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
      + '<rect x="5" y="4" width="8" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/>'
      + '<path d="M3 10.5V3.8C3 2.8 3.8 2 4.8 2h5.7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
      + '</svg>';
  }
  function copyButton(value, label) {
    return '<button class="copy-btn" type="button" data-copy="' + esc(value) + '" title="' + esc(label || "Copy") + '" aria-label="' + esc(label || "Copy") + '">'
      + copyIconSvg()
      + '</button>';
  }
  function setupCopyButtons(root) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-copy]"), function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var value = btn.getAttribute("data-copy") || "";
        var done = function () {
          btn.classList.add("copied");
          window.setTimeout(function () { btn.classList.remove("copied"); }, 900);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(done).catch(function () {});
        }
      });
    });
  }
  function renderInlineMarkdown(text) {
    return esc(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }
  function renderSummaryMarkdown(md) {
    var lines = md.replace(/\r\n/g, "\n").split("\n").filter(function (line) {
      return line.trim();
    });
    if (lines.length && lines.every(function (line) { return /^[-*]\s+/.test(line.trim()); })) {
      return "<ul>" + lines.map(function (line) {
        return "<li>" + renderInlineMarkdown(line.trim().replace(/^[-*]\s+/, "")) + "</li>";
      }).join("") + "</ul>";
    }
    return renderInlineMarkdown(md);
  }
  function renderTestPlanMarkdown(md) {
    if (!md.trim()) {
      return '<div class="side-empty">No test plan yet.<br>Ask the LLM to regenerate the diff guide if this diff needs one.</div>';
    }
    var lines = md.replace(/\r\n/g, "\n").split("\n");
    var html = '<div class="test-plan-panel">';
    var inCode = false;
    var codeLang = "";
    var codeLines = [];
    var flushCode = function () {
      var code = codeLines.join("\n");
      html += '<div class="copy-block">'
        + '<div class="copy-head"><span>' + esc(codeLang || "text") + '</span>' + copyButton(code, "Copy code") + '</div>'
        + '<pre><code>' + esc(code) + '</code></pre>'
        + '</div>';
      codeLines = [];
      codeLang = "";
    };
    lines.forEach(function (line) {
      var fence = line.match(/^```(.*)$/);
      if (fence) {
        if (inCode) { flushCode(); inCode = false; }
        else { inCode = true; codeLang = fence[1].trim(); }
        return;
      }
      if (inCode) { codeLines.push(line); return; }
      if (!line.trim()) return;
      var heading = line.match(/^#{1,3}\s+(.+)$/);
      if (heading) {
        html += '<h3>' + renderInlineMarkdown(heading[1]) + '</h3>';
        return;
      }
      var step = line.match(/^(\d+)\.\s+(.+)$/);
      if (step) {
        html += '<div class="plan-step"><span class="plan-num">' + esc(step[1]) + '</span><p>' + renderInlineMarkdown(step[2]) + '</p></div>';
        return;
      }
      var quote = line.match(/^>\s*(.+)$/);
      if (quote) {
        html += '<div class="copy-quote"><blockquote>' + renderInlineMarkdown(quote[1]) + '</blockquote>' + copyButton(quote[1], "Copy text") + '</div>';
        return;
      }
      html += '<p>' + renderInlineMarkdown(line) + '</p>';
    });
    if (inCode) flushCode();
    return html + '</div>';
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

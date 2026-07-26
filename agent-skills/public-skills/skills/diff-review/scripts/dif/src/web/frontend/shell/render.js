  // ===== render: sidebar (the nav), collapsed rail, main header =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  function renderSidebar() {
    var total = totalFiles();
    els.sideProg.textContent = total ? reviewedTotal() + "/" + total : "";

    if (!groups.length) {
      els.sideScroll.innerHTML =
        '<div class="side-empty">No diff guide yet.<br>Ask the LLM to prepare the review, then it appears here.</div>';
      return;
    }

    var newFiles = newFilePaths();
    var h = '<button class="nav-item ' + (view === "full" ? "active" : "") + '" data-view="full">'
      + '<svg class="ic" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>'
      + '<span class="lbl">Full diff</span><span class="rt">' + total + ' files</span></button>';
    if (newFiles.length) {
      h += '<button class="nav-item newfiles ' + (view === "new" ? "active" : "") + '" data-view="new"'
        + ' title="' + esc(newFiles.join("\n")) + '">'
        + '<svg class="ic" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
        + '<span class="lbl">New files not in guide</span>'
        + '<span class="rt">' + newFiles.length + ' files</span></button>';
    }
    h += '<div class="side-sep"></div>';

    groups.forEach(function (g) {
      var gfiles = g.files || [];
      var rev = gfiles.filter(reviewedLive).length;
      var done = gfiles.length > 0 && rev === gfiles.length;
      var active = view === "g" + g.n;
      h += '<div class="grp-block ' + (active ? "active" : "") + '">'
        + '<button class="grp-head" data-view="g' + g.n + '">'
        + '<span class="kindmark" style="background:' + kindColor(g.kind) + '"></span>'
        + '<span class="grp-min">'
        + '<span class="grp-ticket">' + pad(g.n) + (g.ticket ? " · " + esc(g.ticket) : "") + '</span>'
        + '<span class="grp-name">' + esc(g.name) + '</span>'
        + '</span>'
        + '<span class="grp-frac">' + (done ? "✓" : rev + "/" + gfiles.length) + '</span>'
        + '</button>';
      if (g.orient) h += '<div class="grp-orient">' + esc(g.orient) + '</div>';
      h += '<div class="files">';
      gfiles.forEach(function (f) {
        h += '<button class="fitem ' + (reviewedLive(f) ? "viewed" : "") + '" data-view="g' + g.n + '" data-file="' + esc(f.path) + '">'
          + '<span class="fchk">' + checkSvg(f) + '</span>'
          + '<span class="fmid">'
          + '<span class="fname" data-tip="' + esc(f.path) + '">' + esc(baseName(f.path)) + '</span>'
          + (f.tag ? '<span class="ftag" data-tip="' + esc(f.tag) + '" data-tip-trunc>' + esc(f.tag) + '</span>' : "")
          + '</span>'
          + '</button>';
      });
      h += '</div></div>';
    });
    els.sideScroll.innerHTML = h;
    Array.prototype.forEach.call(els.sideScroll.querySelectorAll("[data-view]"), function (n) {
      n.addEventListener("click", function () {
        var f = n.getAttribute("data-file");
        if (f) selectFile(n.getAttribute("data-view"), f);
        else selectView(n.getAttribute("data-view"));
      });
    });
  }

  // ---- render: collapsed rail ----
  function renderRail() {
    var h = '<button class="rail-btn" id="expandBtn" title="Expand guide" aria-label="Expand guide">'
      + '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l4 5-4 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      + '</button><div class="rail-sep"></div>'
      + '<button class="rail-btn ' + (view === "full" ? "active" : "") + '" data-view="full" title="Full diff">F</button>';
    groups.forEach(function (g) {
      h += '<button class="rail-btn ' + (view === "g" + g.n ? "active" : "") + '" data-view="g' + g.n + '" title="Group ' + g.n + (g.ticket ? " — " + esc(g.ticket) : "") + '">'
        + g.n + '<span class="kd" style="background:' + kindColor(g.kind) + '"></span></button>';
    });
    els.rail.innerHTML = h;
    document.getElementById("expandBtn").addEventListener("click", function () { els.body.classList.remove("collapsed"); });
    Array.prototype.forEach.call(els.rail.querySelectorAll("[data-view]"), function (n) {
      n.addEventListener("click", function () { selectView(n.getAttribute("data-view")); });
    });
  }

  // ---- render: the current-view info, hosted in the top bar ----
  // The view name + file-count chip go on the left (after the brand); the
  // reviewed count + progress bar go on the right (before the palette button).
  // Both live in the top bar so the shell spends no vertical space on a separate
  // per-view sub-header.
  function renderHead() {
    var total = totalFiles();
    var g = groupByView();
    var title, chip, count, rev;
    if (view === "new") {
      var nf = newFilePaths();
      count = nf.length;
      rev = nf.filter(isViewedPath).length;
      title = '<span class="name">New files not in guide</span>';
      chip = '<span class="filter-chip newfiles">◉ Not in guide · ' + count + ' of ' + total + ' files</span>';
    } else if (g) {
      var gfiles = g.files || [];
      count = gfiles.length;
      rev = gfiles.filter(reviewedLive).length;
      title = '<span class="num">' + pad(g.n) + '</span>'
        + (g.ticket ? '<span class="ticket">' + esc(g.ticket) + '</span>' : "")
        + '<span class="name">' + esc(g.name) + '</span>';
      chip = '<span class="filter-chip">◉ Filtered · ' + count + ' of ' + total + ' files</span>';
    } else {
      count = total;
      rev = reviewedTotal();
      title = '<span class="name">Full diff</span>';
      chip = '<span class="filter-chip full">○ all ' + total + ' files</span>';
    }
    var pct = count ? Math.round((rev / count) * 100) : 0;
    els.viewInfo.innerHTML = '<div class="mh-title">' + title + '</div>' + chip;
    els.viewProg.innerHTML = '<span class="txt">' + rev + '/' + count + ' reviewed</span>'
      + '<span class="bar"><i style="width:' + pct + '%"></i></span>';
  }

  // Show "Refresh diff guide" only when the guide's file list differs from the
  // diff. While a regeneration is in flight, keep it visible but disabled so a
  // second click can't queue another regen.
  function updateRegenBtn() {
    if (!els.regenBtn) return;
    if (regenInFlight) { els.regenBtn.hidden = false; els.regenBtn.disabled = true; return; }
    els.regenBtn.disabled = false;
    els.regenBtn.hidden = !guideFileListDiffers();
  }

  function renderAll() {
    renderSidebar();
    renderRail();
    renderHead();
    updateRegenBtn();
    if (spotlightOpen()) renderSpotlight();
  }

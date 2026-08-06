  // ===== iframe / view selection + scroll-to-file =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  function difitUrl(v) {
    if (v === "full") return "/__wrap/difit";
    if (v === "new") return "/__wrap/difit?view=new";
    return "/__wrap/difit?group=" + v.slice(1);
  }
  function showLoading() { els.loading.classList.remove("hidden"); }
  function hideLoading() { els.loading.classList.add("hidden"); }
  function clearTimers() {
    window.clearTimeout(readyTimer);
    window.clearTimeout(retryTimer);
  }
  function showError() {
    clearTimers();
    hideLoading();
    if (els.ifrError) els.ifrError.hidden = false;
  }
  function hideError() { if (els.ifrError) els.ifrError.hidden = true; }

  // (Re)point the iframe at the current view and arm the readiness backstop.
  function loadDifit() {
    hideError();
    showLoading();
    window.clearTimeout(readyTimer);
    // difit posts "difit-ready" when React boots; if it never comes (difit down
    // or still restarting) the backstop retries rather than erroring outright.
    readyTimer = window.setTimeout(function () { if (!difitReady) scheduleRetry(); }, 4000);
    els.iframe.src = difitUrl(view);
  }
  // A load attempt failed (502 / never-ready). Retry silently up to RETRY_MAX,
  // then surface the manual error box.
  function scheduleRetry() {
    clearTimers();
    if (difitReady) return;
    if (attempts >= RETRY_MAX) { showError(); return; }
    attempts++;
    retryTimer = window.setTimeout(loadDifit, RETRY_DELAY);
  }

  function selectView(v) {
    view = v;
    difitReady = false;
    attempts = 0;
    clearTimers();
    loadDifit();
    renderSidebar();
    renderRail();
    renderHead();
  }

  function onDifitReady() {
    difitReady = true;
    attempts = 0;
    clearTimers();
    hideLoading();
    hideError();
    // difit's iframe just (re)loaded the current diff → baseline to it (and keep
    // baselining briefly while difit's /api/diff settles) so it doesn't read as
    // "new changes".
    baselineUntil = nowMs() + 1500;
    fetchDiff(); // difit just re-ran the diff for this view; resync our counts
    if (pendingScroll) { scrollToFile(pendingScroll); pendingScroll = null; }
  }

  els.iframe.addEventListener("load", function () {
    // difit-ready (posted by inject.js when React boots) is the real "booted"
    // signal. Here we only catch the hard failure where the proxied document
    // isn't difit at all (e.g. a 502 with an empty body): no #root => retry.
    if (difitReady) return;
    try {
      var doc = els.iframe.contentDocument;
      if (!doc || !doc.getElementById("root")) scheduleRetry();
    } catch (e) { /* same-origin: shouldn't throw; ignore */ }
  });

  // ---- scroll-to-file (into the difit iframe) ----
  function postToDifit(msg) {
    try {
      var w = els.iframe.contentWindow;
      if (w) {
        msg.source = "dif-web-shell";
        w.postMessage(msg, window.location.origin);
      }
    } catch (e) { /* ignore */ }
  }
  function scrollToFile(path) { postToDifit({ type: "scroll-to-file", path: path }); }
  function selectFile(v, path) {
    if (view === v) {
      if (difitReady) scrollToFile(path);
      else pendingScroll = path; // difit still booting this view; scroll on ready
    } else {
      pendingScroll = path;
      selectView(v);
    }
  }

  // ===== commented: show only the files with comments =====
  // Fragment concatenated into the IIFE opened in shell.js. See that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // For a big diff, the header's "With comments" toggle (and its palette
  // action) narrows the difit iframe to the files difit holds a comment thread
  // on, on top of whichever view is open: the iframe URL gains `commented=1`
  // and the proxy filters `/api/diff` by difit's own comments. The count polls
  // `/api/comments-json`, so it follows comments as they are saved.

  function commentedInDiff() {
    return diffPaths.filter(function (path) { return commentedPaths[path] === true; });
  }

  function renderCommentedBtn() {
    var count = commentedInDiff().length;
    els.commentedCount.textContent = String(count);
    els.commentedBtn.classList.toggle("active", commentedOnly);
    els.commentedBtn.setAttribute("aria-pressed", commentedOnly ? "true" : "false");
    // Nothing to narrow to: off stays off. On stays clickable so it can be undone.
    els.commentedBtn.setAttribute("aria-disabled", !commentedOnly && count === 0 ? "true" : "false");
    setTip(els.commentedBtn, commentedOnly
      ? "Showing only files with comments. Click to show every file again."
      : (count
        ? "Show only the " + plural(count, "file") + " with comments, on top of the current view. Handy for big diffs."
        : "Show only files with comments. No file has comments yet."));
  }

  function setCommentedOnly(isOn) {
    if (commentedOnly === isOn) return;
    commentedOnly = isOn;
    renderCommentedBtn();
    selectView(view); // reload difit narrowed (or widened) to match
  }

  function applyComments(json) {
    var threads = json && json.threads;
    if (!Array.isArray(threads)) return;
    var paths = {};
    threads.forEach(function (thread) {
      var hasMessages = thread && Array.isArray(thread.messages) && thread.messages.length;
      if (hasMessages && thread.filePath) paths[thread.filePath] = true;
    });
    var key = Object.keys(paths).sort().join("\n");
    if (key === lastCommentedKey) return;
    lastCommentedKey = key;
    commentedPaths = paths;
    renderCommentedBtn();
    if (spotlightOpen()) renderSpotlight();
  }
  function fetchComments() {
    fetch("/api/comments-json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("comments " + r.status)); })
      .then(applyComments)
      .catch(function () { /* keep the last known comments */ });
  }

  els.commentedBtn.addEventListener("click", function () {
    if (els.commentedBtn.getAttribute("aria-disabled") === "true") return;
    setCommentedOnly(!commentedOnly);
  });

  // ===== github: the linked PR, sync, the pending review, viewed files =====
  // Fragment concatenated into the IIFE opened in shell.js. See that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // The header shows the branch's PR (or a yellow "No linked PR"), a Sync
  // button that pulls from GitHub now (the poller also pulls every minute), and
  // a Review button that opens the submit panel for the reviewer's pending
  // review. A Sync may stash local changes to pull the PR's new commits; once
  // it finishes the page reloads, and any merge conflicts it left open the
  // modal in conflicts.js. Viewed files flow from difit to GitHub here: difit's writes reach
  // this document as storage events, and each changed path is sent to
  // `/__wrap/github/viewed` (marking a directory sends one change per file).
  // GitHub -> difit viewed changes are applied inside difit by inject/viewed.js.
  var gh = null;
  var ghSubmitting = false;
  var ghFlash = "";
  var ghFlashTimer = null;
  var ghFastForwards = null;
  var ghReviewerPulls = null; // Syncs finished as of the last poll
  var autoShowChanges = false; // the branch was fast-forwarded: reload the diff
  var ghPushedViewed = null;   // the viewed set last sent to GitHub
  var ghEls = {
    noPr: document.getElementById("ghNoPr"),
    pr: document.getElementById("ghPr"),
    prNum: document.getElementById("ghPrNum"),
    sync: document.getElementById("ghSync"),
    review: document.getElementById("ghReview"),
    reviewLabel: document.getElementById("ghReviewLabel"),
    reviewCount: document.getElementById("ghReviewCount"),
    notice: document.getElementById("ghNotice"),
    pop: document.getElementById("ghPop"),
    popSub: document.getElementById("ghPopSub"),
    popBody: document.getElementById("ghPopBody"),
    popEvents: document.getElementById("ghPopEvents"),
    popError: document.getElementById("ghPopError"),
    popCancel: document.getElementById("ghPopCancel"),
    popSubmit: document.getElementById("ghPopSubmit"),
  };

  function plural(numItems, word) { return numItems + " " + word + (numItems === 1 ? "" : "s"); }

  function ghSyncTitle(sync) {
    var what = "Sync with GitHub now: pull new PR comments and commits. Your uncommitted changes are stashed and put back, then the page reloads.\n"
      + "dif also syncs every minute, without touching your changes.";
    if (sync.error) return what + "\nThe last sync failed: " + sync.error;
    if (sync.secondsSincePull == null) return what;
    return what + "\nLast synced " + sync.secondsSincePull + "s ago.";
  }

  function renderGithub() {
    var state = gh;
    var available = !!(state && state.available && state.pr);
    ghEls.noPr.hidden = !(state && state.lookedUp && !available);
    setTip(ghEls.noPr, "No open GitHub PR for this branch" + (state && state.reason ? ": " + state.reason : "") + ".\n"
      + "Comments go only to the TUI until a PR exists. dif checks again every minute.");
    ghEls.pr.hidden = !available;
    ghEls.sync.hidden = !available;
    if (!available) {
      ghEls.review.hidden = true;
      ghEls.notice.hidden = true;
      return;
    }
    var pr = state.pr;
    ghEls.pr.href = pr.url;
    ghEls.prNum.textContent = "#" + pr.number;
    setTip(ghEls.pr, "Open PR #" + pr.number + " on GitHub, by " + pr.author + ".\n"
      + (state.viewed.active ? "Viewed files sync both ways with GitHub." : (state.viewed.reason || "Viewed files are not syncing.")));
    ghEls.sync.classList.toggle("busy", !!state.sync.pulling);
    setTip(ghEls.sync, ghSyncTitle(state.sync));
    var drafts = state.drafts || 0;
    ghEls.review.hidden = !(drafts || state.failed || !pr.isOwn);
    ghEls.reviewLabel.textContent = pr.isOwn ? "Submit comments" : "Review";
    ghEls.reviewCount.hidden = !drafts;
    ghEls.reviewCount.textContent = String(drafts);
    setTip(ghEls.review, drafts
      ? plural(drafts, "draft PR comment") + " waiting to be published. Open the panel to submit your review."
      : (pr.isOwn ? "Publish your draft comments on your PR" : "Submit a review: comment, approve, or request changes"));
    var notice = ghFlash || state.sync.notice || (state.sync.error ? "GitHub sync failed: " + state.sync.error : "");
    ghEls.notice.hidden = !notice;
    ghEls.notice.textContent = notice;
    ghEls.notice.setAttribute("data-tip", notice);
    ghEls.notice.classList.toggle("ok", !!ghFlash);
  }

  function flashGithub(message) {
    ghFlash = message;
    window.clearTimeout(ghFlashTimer);
    ghFlashTimer = window.setTimeout(function () { ghFlash = ""; renderGithub(); }, 5000);
    renderGithub();
  }

  function applyGithub(state) {
    if (!state || typeof state !== "object") return;
    gh = state;
    var reviewerPulls = state.sync ? state.sync.reviewerPulls : null;
    if (ghReviewerPulls !== null && reviewerPulls > ghReviewerPulls && !state.sync.error) {
      reloadShell(); // a Sync finished: show the pulled code and comments fresh
      return;
    }
    ghReviewerPulls = reviewerPulls;
    if (ghSubmitting && !state.submitting && state.lastSubmit) {
      ghSubmitting = false;
      setSubmitBusy(false);
      if (state.lastSubmit.ok) {
        closeReviewPop();
        ghEls.popBody.value = "";
        flashGithub(state.lastSubmit.message);
      } else {
        showPopError(state.lastSubmit.message);
      }
    }
    if (ghFastForwards !== null && state.fastForwards > ghFastForwards) {
      autoShowChanges = true; // the next /api/diff check reloads difit in place
      fetchDiff();
      flashGithub("Pulled the PR's new commits.");
    }
    ghFastForwards = state.fastForwards;
    renderGithub();
    renderConflicts(state.conflicts);
    if (!ghEls.pop.hidden) renderReviewPop();
  }

  function fetchGithub() {
    fetch("/__wrap/github.json", { cache: "no-store" })
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(new Error("github " + response.status));
      })
      .then(applyGithub)
      .catch(function () { /* keep the last known state */ });
  }

  // Called from data.js once a fresh /api/diff shows the fast-forwarded code.
  function maybeAutoShowChanges() {
    if (autoShowChanges && changesAvailable) {
      autoShowChanges = false;
      showNewChanges();
    }
  }

  ghEls.sync.addEventListener("click", function () {
    ghEls.sync.classList.add("busy");
    fetch("/__wrap/github/pull", { method: "POST" }).then(fetchGithub, fetchGithub);
  });

  // ---- the review panel ----
  function showPopError(message) {
    ghEls.popError.hidden = !message;
    ghEls.popError.textContent = message || "";
  }
  function setSubmitBusy(busy) {
    ghEls.popSubmit.disabled = busy;
    ghEls.popSubmit.textContent = busy ? "Submitting…" : (gh && gh.pr && gh.pr.isOwn ? "Submit comments" : "Submit review");
  }
  function renderReviewPop() {
    if (!gh || !gh.pr) return;
    var isOwnPr = gh.pr.isOwn;
    var drafts = gh.drafts || 0;
    var subtitle = drafts ? plural(drafts, "draft comment") + " will be published." : "No draft comments.";
    if (isOwnPr) subtitle += " This is your PR, so GitHub only lets you comment.";
    ghEls.popSub.textContent = subtitle;
    ghEls.popEvents.hidden = isOwnPr;
    if (!ghSubmitting) setSubmitBusy(false);
    if (gh.failed && !ghSubmitting) {
      showPopError(plural(gh.failed, "PR comment") + " failed to post. Fix or delete them first.");
    }
  }
  function positionReviewPop() {
    var rect = ghEls.review.getBoundingClientRect();
    var width = Math.min(360, window.innerWidth - 32);
    ghEls.pop.style.width = width + "px";
    ghEls.pop.style.top = rect.bottom + 6 + "px";
    ghEls.pop.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)) + "px";
  }
  function openReviewPop() {
    showPopError("");
    renderReviewPop();
    positionReviewPop();
    ghEls.pop.hidden = false;
    ghEls.review.setAttribute("aria-expanded", "true");
    ghEls.popBody.focus();
  }
  function closeReviewPop() {
    // Focus inside the panel would be stranded on a hidden element, so hand it
    // back to the button that opened the panel.
    var hadFocus = ghEls.pop.contains(document.activeElement);
    ghEls.pop.hidden = true;
    ghEls.review.setAttribute("aria-expanded", "false");
    if (hadFocus) ghEls.review.focus();
  }
  function submitReview() {
    if (ghSubmitting || !gh || !gh.pr) return;
    var checked = ghEls.popEvents.querySelector("input[name=ghEvent]:checked");
    var event = gh.pr.isOwn ? "COMMENT" : (checked ? checked.value : "COMMENT");
    showPopError("");
    ghSubmitting = true;
    setSubmitBusy(true);
    fetch("/__wrap/github/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: event, body: ghEls.popBody.value }),
    }).then(function (response) {
      if (!response.ok) throw new Error("GitHub would not take that review (" + response.status + ").");
      fetchGithub();
    }).catch(function (err) {
      ghSubmitting = false;
      setSubmitBusy(false);
      showPopError(err.message);
    });
  }
  ghEls.review.addEventListener("click", function () {
    if (ghEls.pop.hidden) openReviewPop(); else closeReviewPop();
  });
  ghEls.popCancel.addEventListener("click", closeReviewPop);
  ghEls.popSubmit.addEventListener("click", submitReview);
  ghEls.popBody.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); submitReview(); }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !ghEls.pop.hidden) closeReviewPop();
  });
  document.addEventListener("mousedown", function (event) {
    if (ghEls.pop.hidden || ghEls.pop.contains(event.target) || ghEls.review.contains(event.target)) return;
    closeReviewPop();
  });
  window.addEventListener("resize", function () { if (!ghEls.pop.hidden) positionReviewPop(); });

  // ---- viewed files: difit -> GitHub ----
  function snapshotViewed() { return Object.assign({}, liveViewed); }
  function initViewedSync() { ghPushedViewed = snapshotViewed(); }
  function pushViewedChanges() {
    var now = snapshotViewed();
    var before = ghPushedViewed || {};
    ghPushedViewed = now;
    var changes = [];
    Object.keys(Object.assign({}, before, now)).forEach(function (path) {
      if (!!before[path] !== !!now[path]) changes.push({ path: path, viewed: !!now[path] });
    });
    if (!changes.length || !gh || !gh.viewed || !gh.viewed.active) return;
    fetch("/__wrap/github/viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes: changes }),
    }).catch(function () { /* dropped: GitHub keeps its state until the next pull */ });
  }

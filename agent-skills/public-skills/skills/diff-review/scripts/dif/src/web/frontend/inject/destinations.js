// dif web shell: PR comments inside difit. Concatenated after inject.js into
// the one injected script; it has its own scope.
(function () {
  "use strict";
  // ===== Comment destinations: the TUI's LLM pane, or the GitHub PR =====
  // Every difit comment box gets a TUI / PR toggle. A PR comment is saved in
  // difit like any other (so it still shows here and in the transcript), but
  // its save carries an `X-Dif-Destination: github` header: the shell marks it
  // as a PR comment before difit sees it, so it is never typed into the LLM
  // pane, and the poller adds it to the reviewer's pending GitHub review as a
  // draft. Editing or deleting it in difit later is mirrored to the PR. PR
  // comments (including ones pulled in from GitHub) are restyled from the
  // shell's `/__wrap/github.json`: blue with a GitHub badge, dashed while they
  // are still drafts, red when GitHub rejected them.
  //
  // In Bulk mode a TUI comment is held for Send all; Cmd+Alt+Enter (macOS) or
  // Ctrl+Alt+Enter saves one with an `X-Dif-Send: now` header instead, and the
  // shell hands that comment to the LLM at once, leaving the rest held.
  var DEST_HEADER = "X-Dif-Destination";
  var SEND_HEADER = "X-Dif-Send";
  var EDIT_PLACEHOLDER = "Edit your message...";
  var REPLY_PLACEHOLDER = "Write a reply...";
  var ARM_WINDOW_MS = 5000;
  var GH_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';
  // Toggle a comment box between TUI and PR from the keyboard: Ctrl+G on macOS,
  // Alt+Shift+G elsewhere (the shell's hotkey leader; "G" for GitHub). It only
  // acts while focus is inside a comment box.
  var IS_MAC = /Mac|iP(hone|ad|od)/.test((navigator.platform || "") + " " + (navigator.userAgent || ""));
  var TOGGLE_HINT = IS_MAC ? "⌃G" : "Alt+Shift+G";
  var SEND_OTHER_HINT = IS_MAC ? "⌘⇧↵" : "Ctrl+Shift+Enter";
  var SEND_NOW_HINT = IS_MAC ? "⌘⌥↵" : "Ctrl+Alt+Enter";
  function isSendNowCombo(event) {
    if (event.key !== "Enter" || event.shiftKey) return false;
    return IS_MAC
      ? event.metaKey && event.altKey && !event.ctrlKey
      : event.ctrlKey && event.altKey && !event.metaKey;
  }
  function isToggleCombo(event) {
    if (event.code !== "KeyG" || event.metaKey) return false;
    return IS_MAC
      ? event.ctrlKey && !event.altKey && !event.shiftKey
      : event.altKey && event.shiftKey && !event.ctrlKey;
  }
  var github = { available: false, reason: "", pr: null, comments: {} };
  // Whether GitHub is unreachable, per the shell's sync state.
  function isGithubOffline() {
    return !!github.connection && !github.connection.online;
  }
  // A PR comment can be written when the branch has a PR, or while offline
  // before the PR could be looked up: the shell queues it until GitHub answers.
  function canPostToPr() {
    return github.available || (!github.lookedUp && isGithubOffline());
  }
  // The shell's TUI delivery mode ("bulk" holds comments for Send all).
  var deliveryMode = "bulk";
  var threadsById = {};
  var armedGithubAt = 0;
  var armedSendNowAt = 0;

  // The rules ship inside this script because it is the only asset the shell
  // injects into difit's document.
  var destStyle = document.createElement("style");
  destStyle.textContent = [
    ".dif-dest{display:inline-flex;margin-right:auto;border:1px solid rgba(128,128,128,.35);border-radius:6px;padding:1px;font-size:12px;line-height:1}",
    ".dif-dest button{display:inline-flex;align-items:center;gap:4px;font:inherit;color:inherit;opacity:.65;background:transparent;border:0;border-radius:4px;padding:4px 8px;cursor:pointer}",
    ".dif-dest button:hover:not(:disabled){opacity:1}",
    ".dif-dest button[aria-checked=true]{opacity:1;background:rgba(128,128,128,.18)}",
    ".dif-dest button[data-dest=github][aria-checked=true]{color:#fff;background:#2f81f7}",
    ".dif-dest button:disabled{opacity:.3;cursor:not-allowed}",
    ".dif-dest button:focus-visible{outline:2px solid #2f81f7;outline-offset:1px}",
    ".dif-dest kbd{align-self:center;font:inherit;font-size:11px;opacity:.5;padding:0 6px 0 4px}",
    // The submit button names where the comment goes. Its label is drawn by
    // CSS from an attribute so React keeps owning the button's text node.
    "button[data-dif-submit-label]{font-size:0!important;transition:none!important}",
    "button[data-dif-submit-label]::after{content:attr(data-dif-submit-label);font-size:.75rem;line-height:1rem}",
    "form[data-dif-dest=github] button[data-dif-submit-label]{color:#fff!important;background-color:#2f81f7!important;border-color:#2f81f7!important}",
    "[data-dif-gh-thread]{border-color:rgba(47,129,247,.45)!important;border-left-color:#2f81f7!important;background-color:rgba(47,129,247,.07)!important}",
    "[data-dif-gh-thread=pending],[data-dif-gh-thread=draft]{border-left-style:dashed!important}",
    "[data-dif-gh-thread=failed]{border-color:rgba(248,81,73,.45)!important;border-left-color:#f85149!important;background-color:rgba(248,81,73,.06)!important}",
    "[data-dif-gh]{box-shadow:inset 2px 0 0 #2f81f7;padding-left:8px;border-radius:2px}",
    "[data-dif-gh=failed]{box-shadow:inset 2px 0 0 #f85149}",
    ".dif-gh-badge{order:99;display:inline-flex;align-items:center;gap:4px;flex-shrink:0;align-self:flex-start;margin-top:2px;font-size:11px;font-weight:500;line-height:16px;white-space:nowrap;text-decoration:none;color:#2f81f7;background:rgba(47,129,247,.1);border:1px solid rgba(47,129,247,.5);border-radius:999px;padding:1px 7px}",
    ".dif-gh-badge:hover{background:rgba(47,129,247,.18)}",
    "[data-dif-gh=pending]>.dif-gh-badge,[data-dif-gh=draft]>.dif-gh-badge{border-style:dashed}",
    "[data-dif-gh=failed]>.dif-gh-badge{color:#f85149;background:rgba(248,81,73,.1);border-color:rgba(248,81,73,.5)}",
  ].join("\n");
  (document.head || document.documentElement).appendChild(destStyle);

  // ---- sync state + thread structure ----
  function fetchGithubState() {
    return window.fetch("/__wrap/github.json", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (state) { if (state) github = state; })
      .catch(function () { /* keep the last known state */ });
  }
  function fetchThreads() {
    return window.fetch("/api/comments-json", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (json) {
        if (!json || !Array.isArray(json.threads)) return;
        var byId = {};
        json.threads.forEach(function (thread) { if (thread && thread.id) byId[thread.id] = thread; });
        threadsById = byId;
      })
      .catch(function () { /* keep the last known threads */ });
  }
  function fetchDeliveryMode() {
    return window.fetch("/__wrap/dispatch.json", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(function (state) { if (state && state.mode) deliveryMode = state.mode; })
      .catch(function () { /* keep the last known mode */ });
  }
  function refreshDestinations() {
    Promise.all([fetchGithubState(), fetchThreads(), fetchDeliveryMode()]).then(decorateAll);
  }

  // ---- the per-box destination toggle ----
  function threadRootEntry(element) {
    var host = element && element.closest ? element.closest('[id^="comment-thread-"]') : null;
    var thread = host ? threadsById[host.id.slice("comment-thread-".length)] : null;
    var root = thread && thread.messages && thread.messages[0];
    return root ? github.comments[root.id] : null;
  }
  // What the submit button says for `dest`: where the comment goes, and for
  // the TUI whether it waits for Send all.
  function buildSubmitLabel(form, dest) {
    var textarea = form.querySelector("textarea");
    var isReply = !!textarea && textarea.placeholder === REPLY_PLACEHOLDER;
    if (dest === "github") return isReply ? "Add reply to PR review" : "Add to PR review";
    var reply = isReply ? " reply" : "";
    return deliveryMode === "eager" ? "Send" + reply + " to TUI" : "Queue" + reply + " for TUI";
  }
  function labelSubmit(form) {
    var submit = form.querySelector('button[type="submit"]');
    if (!submit) return;
    var dest = form.getAttribute("data-dif-dest");
    var label = buildSubmitLabel(form, dest);
    setAttr(submit, "data-dif-submit-label", label);
    setAttr(submit, "aria-label", label);
    var otherDest = oppositeDest(form);
    var canSendOther = otherDest === "local" || canPostToPr();
    var hints = [];
    if (canSendOther) hints.push(SEND_OTHER_HINT + ": " + buildSubmitLabel(form, otherDest) + " instead");
    if (dest !== "github" && deliveryMode === "bulk") hints.push(SEND_NOW_HINT + ": Send to TUI now, skipping the queue");
    setAttr(submit, "title", hints.length ? hints.join("\n") : null);
  }
  function setDest(form, dest) {
    if (dest === "github" && !canPostToPr()) dest = "local";
    form.setAttribute("data-dif-dest", dest);
    // A roving tabindex: only the checked radio is in the tab order, and the
    // arrow keys move between them, as the ARIA radio group pattern expects.
    form.querySelectorAll(".dif-dest button").forEach(function (button) {
      var isChecked = button.getAttribute("data-dest") === dest;
      button.setAttribute("aria-checked", isChecked ? "true" : "false");
      button.tabIndex = isChecked ? 0 : -1;
    });
    labelSubmit(form);
  }
  // Arrow keys move the selection between a toggle's enabled radios.
  function onDestArrowKey(form, event) {
    var step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
    if (!step) return;
    event.preventDefault();
    var enabled = Array.from(form.querySelectorAll(".dif-dest button")).filter(function (button) {
      return !button.disabled;
    });
    var current = enabled.findIndex(function (button) {
      return button.getAttribute("aria-checked") === "true";
    });
    var target = enabled[(current + step + enabled.length) % enabled.length];
    if (!target) return;
    setDest(form, target.getAttribute("data-dest"));
    target.focus();
  }
  function destButton(dest, html, title) {
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "radio");
    button.setAttribute("data-dest", dest);
    button.title = title;
    button.innerHTML = html;
    return button;
  }
  function addDestToggle(form, cancel) {
    var group = document.createElement("div");
    group.className = "dif-dest";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", "Send this comment to");
    group.appendChild(destButton("local", "TUI",
      "TUI: send this comment to the LLM in the dif terminal. In Bulk mode it waits for Send all, unless you save with "
      + SEND_NOW_HINT + ". " + TOGGLE_HINT + " toggles TUI / PR."));
    group.appendChild(destButton("github", GH_ICON + "<span>PR</span>", "PR: post to the GitHub PR (" + TOGGLE_HINT + " toggles)"));
    var hint = document.createElement("kbd");
    hint.textContent = TOGGLE_HINT;
    hint.setAttribute("aria-hidden", "true");
    group.appendChild(hint);
    group.addEventListener("click", function (event) {
      var button = event.target.closest ? event.target.closest("button[data-dest]") : null;
      if (button && !button.disabled) setDest(form, button.getAttribute("data-dest"));
    });
    group.addEventListener("keydown", function (event) { onDestArrowKey(form, event); });
    cancel.parentNode.insertBefore(group, cancel);
    // A reply in a PR thread defaults to the PR; everything else to the TUI.
    setDest(form, threadRootEntry(form) ? "github" : "local");
  }
  function prButtonTitle() {
    if (github.available) {
      return "PR: add this comment to your pending review on GitHub PR #" + github.pr.number
        + " as a draft. The LLM never sees it. " + TOGGLE_HINT + " toggles TUI / PR.";
    }
    if (canPostToPr()) {
      return "PR: you're offline, so this comment is queued. It goes to your pending review on this branch's PR"
        + " once you're back online. The LLM never sees it. " + TOGGLE_HINT + " toggles TUI / PR.";
    }
    return "PR: unavailable. " + (github.reason || "This branch has no GitHub PR to post to.");
  }
  function decorateForms() {
    document.querySelectorAll("form").forEach(function (form) {
      var textarea = form.querySelector("textarea");
      var cancel = form.querySelector('[data-comment-cancel="true"]');
      if (!textarea || !cancel || textarea.placeholder === EDIT_PLACEHOLDER) return;
      if (!form.querySelector(".dif-dest")) addDestToggle(form, cancel);
      var githubButton = form.querySelector('.dif-dest button[data-dest="github"]');
      githubButton.disabled = !canPostToPr();
      githubButton.title = prButtonTitle();
      if (!canPostToPr() && form.getAttribute("data-dif-dest") === "github") setDest(form, "local");
      else labelSubmit(form);
    });
  }

  // Arm the next comment save when a PR box submits (button or Mod+Enter).
  function armIfGithub(form) {
    if (form && form.getAttribute && form.getAttribute("data-dif-dest") === "github") {
      armedGithubAt = Date.now();
    }
  }
  document.addEventListener("submit", function (event) { armIfGithub(event.target); }, true);
  document.addEventListener("keydown", function (event) {
    if (!isToggleCombo(event)) return;
    var form = event.target && event.target.closest ? event.target.closest("form") : null;
    if (!form || !form.querySelector(".dif-dest")) return;
    event.preventDefault();
    event.stopPropagation();
    var toggledDest = form.getAttribute("data-dif-dest") === "github" ? "local" : "github";
    setDest(form, toggledDest); // falls back to TUI when there is no PR
  }, true);
  // Mod+Enter saves to the box's toggle; Mod+Shift+Enter saves to the other
  // destination without flipping the toggle. difit submits on both, so this
  // only decides whether the save is tagged for the PR. A TUI save is untagged
  // and follows the shell's Bulk / Eager mode like any other.
  function oppositeDest(form) {
    return form.getAttribute("data-dif-dest") === "github" ? "local" : "github";
  }
  document.addEventListener("keydown", function (event) {
    var target = event.target;
    if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey) || !target || target.tagName !== "TEXTAREA") return;
    var form = target.closest("form");
    // Bulk + TUI: Cmd+Alt+Enter sends this comment at once. difit still
    // submits (it saves on Mod+Enter); this only tags the save.
    if (isSendNowCombo(event) && form && form.getAttribute("data-dif-dest") !== "github" && deliveryMode === "bulk") {
      armedGithubAt = 0;
      armedSendNowAt = Date.now();
      return;
    }
    if (!event.shiftKey || !form || !form.querySelector(".dif-dest")) {
      armIfGithub(form);
      return;
    }
    if (oppositeDest(form) === "local") {
      armedGithubAt = 0;
      return;
    }
    if (!canPostToPr()) {
      // No PR to post to: swallow the save rather than send it to the TUI.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    armedGithubAt = Date.now();
  }, true);

  // difit saves comments with fetch; tag the armed save for the shell.
  var nativeFetch = window.fetch.bind(window);
  function isCommentSave(input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    var method = (init && init.method) || (input && input.method) || "GET";
    try {
      return method.toUpperCase() === "POST" && new URL(url, window.location.href).pathname === "/api/comments";
    } catch (err) { return false; }
  }
  function isArmed(armedAt) { return armedAt && Date.now() - armedAt < ARM_WINDOW_MS; }
  function withHeader(init, name, value) {
    var tagged = Object.assign({}, init);
    var headers = new Headers((init && init.headers) || {});
    headers.set(name, value);
    tagged.headers = headers;
    return tagged;
  }
  window.fetch = function (input, init) {
    if (isArmed(armedGithubAt) && isCommentSave(input, init)) {
      armedGithubAt = 0;
      return nativeFetch(input, withHeader(init, DEST_HEADER, "github")).then(function (response) {
        window.setTimeout(refreshDestinations, 300);
        return response;
      });
    }
    if (isArmed(armedSendNowAt) && isCommentSave(input, init)) {
      armedSendNowAt = 0;
      return nativeFetch(input, withHeader(init, SEND_HEADER, "now"));
    }
    return nativeFetch(input, init);
  };

  // ---- restyle PR comments ----
  function setAttr(element, name, value) {
    if (value == null) { if (element.hasAttribute(name)) element.removeAttribute(name); }
    else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }
  function badgeLabel(entry) {
    if (entry.status === "published") return "On PR";
    if (entry.status === "draft") return "PR draft";
    if (entry.status === "failed") return "PR sync failed";
    if (isGithubOffline()) return "Queued for PR";
    return "Saving to PR…";
  }
  function badgeTitle(entry, href) {
    if (entry.error) return "GitHub: " + entry.error + " (edit the comment to retry)";
    if (entry.status === "pending" && isGithubOffline()) {
      return "GitHub is unreachable. This comment is saved and queued: it goes to your pending review once you're back online.";
    }
    return href;
  }
  // The badge is appended to a React-owned element, and React may re-insert its
  // own children after it, so CSS `order` keeps it last in the row.
  function decorateMessage(messageEl, entry) {
    if (!messageEl) return;
    var badge = messageEl.querySelector(":scope > .dif-gh-badge");
    setAttr(messageEl, "data-dif-gh", entry ? entry.status : null);
    if (!entry) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = document.createElement("a");
      badge.className = "dif-gh-badge";
      badge.target = "_blank";
      badge.rel = "noopener noreferrer";
      badge.addEventListener("click", function (event) { event.stopPropagation(); });
      messageEl.appendChild(badge);
    }
    var label = badgeLabel(entry);
    var html = GH_ICON + "<span>" + label + "</span>";
    if (badge.getAttribute("data-label") !== label) {
      badge.setAttribute("data-label", label);
      badge.innerHTML = html;
    }
    var href = entry.url || (github.pr && github.pr.url) || "";
    setAttr(badge, "href", href || null);
    setAttr(badge, "title", badgeTitle(entry, href));
  }
  // A thread's body lists the root message, then one wrapper per reply, then
  // (while open) the reply form.
  function messageElements(threadEl) {
    var body = threadEl.children[1];
    if (!body) return [];
    return Array.from(body.children)
      .filter(function (child, idx) {
        var textarea = child.querySelector("textarea");
        return idx === 0 || !textarea || textarea.placeholder !== REPLY_PLACEHOLDER;
      })
      .map(function (child, idx) { return idx === 0 ? child : child.firstElementChild; });
  }
  function decorateThreads() {
    document.querySelectorAll('[id^="comment-thread-"]').forEach(function (threadEl) {
      var thread = threadsById[threadEl.id.slice("comment-thread-".length)];
      if (!thread || !Array.isArray(thread.messages)) return;
      var slots = messageElements(threadEl);
      thread.messages.forEach(function (message, idx) {
        decorateMessage(slots[idx], github.comments[message.id]);
      });
      var root = thread.messages[0] && github.comments[thread.messages[0].id];
      setAttr(threadEl, "data-dif-gh-thread", root ? root.status : null);
    });
  }
  function decorateAll() {
    decorateForms();
    decorateThreads();
  }

  var decorateTimer = null;
  new MutationObserver(function () {
    window.clearTimeout(decorateTimer);
    decorateTimer = window.setTimeout(decorateAll, 60);
  }).observe(document.documentElement, { childList: true, subtree: true });
  refreshDestinations();
  window.setInterval(refreshDestinations, 2000);
})();

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
  var DEST_HEADER = "X-Dif-Destination";
  var EDIT_PLACEHOLDER = "Edit your message...";
  var REPLY_PLACEHOLDER = "Write a reply...";
  var ARM_WINDOW_MS = 5000;
  var GH_ICON = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" fill="currentColor"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/></svg>';
  var github = { available: false, reason: "", pr: null, comments: {} };
  var threadsById = {};
  var armedGithubAt = 0;

  var destStyle = document.createElement("style");
  destStyle.textContent = [
    ".dif-dest{display:inline-flex;margin-right:auto;border:1px solid rgba(128,128,128,.35);border-radius:6px;padding:1px;font-size:12px;line-height:1}",
    ".dif-dest button{display:inline-flex;align-items:center;gap:4px;font:inherit;color:inherit;opacity:.65;background:transparent;border:0;border-radius:4px;padding:4px 8px;cursor:pointer}",
    ".dif-dest button:hover:not(:disabled){opacity:1}",
    ".dif-dest button[aria-checked=true]{opacity:1;background:rgba(128,128,128,.18)}",
    ".dif-dest button[data-dest=github][aria-checked=true]{color:#fff;background:#2f81f7}",
    ".dif-dest button:disabled{opacity:.3;cursor:not-allowed}",
    ".dif-dest button:focus-visible{outline:2px solid #2f81f7;outline-offset:1px}",
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
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (state) { if (state) github = state; })
      .catch(function () { /* keep the last known state */ });
  }
  function fetchThreads() {
    return window.fetch("/api/comments-json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (json) {
        if (!json || !Array.isArray(json.threads)) return;
        var byId = {};
        json.threads.forEach(function (t) { if (t && t.id) byId[t.id] = t; });
        threadsById = byId;
      })
      .catch(function () { /* keep the last known threads */ });
  }
  function refreshDestinations() {
    Promise.all([fetchGithubState(), fetchThreads()]).then(decorateAll);
  }

  // ---- the per-box destination toggle ----
  function threadRootEntry(el) {
    var host = el && el.closest ? el.closest('[id^="comment-thread-"]') : null;
    var thread = host ? threadsById[host.id.slice("comment-thread-".length)] : null;
    var root = thread && thread.messages && thread.messages[0];
    return root ? github.comments[root.id] : null;
  }
  function setDest(form, dest) {
    if (dest === "github" && !github.available) dest = "local";
    form.setAttribute("data-dif-dest", dest);
    var buttons = form.querySelectorAll(".dif-dest button");
    for (var i = 0; i < buttons.length; i++) {
      var on = buttons[i].getAttribute("data-dest") === dest;
      buttons[i].setAttribute("aria-checked", on ? "true" : "false");
    }
  }
  function destButton(dest, html, title) {
    var b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("data-dest", dest);
    b.title = title;
    b.innerHTML = html;
    return b;
  }
  function addDestToggle(form, cancel) {
    var group = document.createElement("div");
    group.className = "dif-dest";
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", "Send this comment to");
    group.appendChild(destButton("local", "TUI", "Send to the LLM in the dif TUI"));
    group.appendChild(destButton("github", GH_ICON + "<span>PR</span>", "Post to the GitHub PR only (the LLM never sees it)"));
    group.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-dest]") : null;
      if (b && !b.disabled) setDest(form, b.getAttribute("data-dest"));
    });
    cancel.parentNode.insertBefore(group, cancel);
    // A reply in a PR thread defaults to the PR; everything else to the TUI.
    setDest(form, threadRootEntry(form) ? "github" : "local");
  }
  function decorateForms() {
    var forms = document.querySelectorAll("form");
    for (var i = 0; i < forms.length; i++) {
      var form = forms[i];
      var textarea = form.querySelector("textarea");
      var cancel = form.querySelector('[data-comment-cancel="true"]');
      if (!textarea || !cancel || textarea.placeholder === EDIT_PLACEHOLDER) continue;
      if (!form.querySelector(".dif-dest")) addDestToggle(form, cancel);
      var ghBtn = form.querySelector('.dif-dest button[data-dest="github"]');
      ghBtn.disabled = !github.available;
      ghBtn.title = github.available
        ? "Post to GitHub PR #" + github.pr.number + " only (the LLM never sees it)"
        : github.reason || "No GitHub PR to post to";
      if (!github.available && form.getAttribute("data-dif-dest") === "github") setDest(form, "local");
    }
  }

  // Arm the next comment save when a PR box submits (button or Mod+Enter).
  function armIfGithub(form) {
    if (form && form.getAttribute && form.getAttribute("data-dif-dest") === "github") {
      armedGithubAt = Date.now();
    }
  }
  document.addEventListener("submit", function (e) { armIfGithub(e.target); }, true);
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && t && t.tagName === "TEXTAREA") {
      armIfGithub(t.closest("form"));
    }
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
  window.fetch = function (input, init) {
    if (armedGithubAt && Date.now() - armedGithubAt < ARM_WINDOW_MS && isCommentSave(input, init)) {
      armedGithubAt = 0;
      var tagged = Object.assign({}, init);
      var headers = new Headers((init && init.headers) || {});
      headers.set(DEST_HEADER, "github");
      tagged.headers = headers;
      return nativeFetch(input, tagged).then(function (r) {
        window.setTimeout(refreshDestinations, 300);
        return r;
      });
    }
    return nativeFetch(input, init);
  };

  // ---- restyle PR comments ----
  function setAttr(el, name, value) {
    if (value == null) { if (el.hasAttribute(name)) el.removeAttribute(name); }
    else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }
  function badgeLabel(entry) {
    if (entry.status === "published") return "On PR";
    if (entry.status === "draft") return "PR draft";
    if (entry.status === "failed") return "PR sync failed";
    return "Saving to PR…";
  }
  // The badge is appended to a React-owned element, and React may re-insert its
  // own children after it, so CSS `order` keeps it last in the row.
  function decorateMessage(el, entry) {
    if (!el) return;
    var badge = null;
    for (var i = 0; i < el.children.length; i++) {
      if (el.children[i].classList.contains("dif-gh-badge")) badge = el.children[i];
    }
    setAttr(el, "data-dif-gh", entry ? entry.status : null);
    if (!entry) { if (badge) badge.remove(); return; }
    if (!badge) {
      badge = document.createElement("a");
      badge.className = "dif-gh-badge";
      badge.target = "_blank";
      badge.rel = "noopener noreferrer";
      badge.addEventListener("click", function (e) { e.stopPropagation(); });
      el.appendChild(badge);
    }
    var label = badgeLabel(entry);
    var html = GH_ICON + "<span>" + label + "</span>";
    if (badge.getAttribute("data-label") !== label) {
      badge.setAttribute("data-label", label);
      badge.innerHTML = html;
    }
    var href = entry.url || (github.pr && github.pr.url) || "";
    setAttr(badge, "href", href || null);
    setAttr(badge, "title", entry.error ? "GitHub: " + entry.error + " (edit the comment to retry)" : href);
  }
  // A thread's body lists the root message, then one wrapper per reply, then
  // (while open) the reply form.
  function messageElements(threadEl) {
    var body = threadEl.children[1];
    if (!body) return [];
    var out = [];
    for (var i = 0; i < body.children.length; i++) {
      var child = body.children[i];
      var textarea = child.querySelector("textarea");
      if (i > 0 && textarea && textarea.placeholder === REPLY_PLACEHOLDER) continue;
      out.push(i === 0 ? child : child.firstElementChild);
    }
    return out;
  }
  function decorateThreads() {
    var threadEls = document.querySelectorAll('[id^="comment-thread-"]');
    for (var i = 0; i < threadEls.length; i++) {
      var el = threadEls[i];
      var thread = threadsById[el.id.slice("comment-thread-".length)];
      if (!thread || !Array.isArray(thread.messages)) continue;
      var slots = messageElements(el);
      thread.messages.forEach(function (m, index) {
        decorateMessage(slots[index], github.comments[m.id]);
      });
      var root = thread.messages[0] && github.comments[thread.messages[0].id];
      setAttr(el, "data-dif-gh-thread", root ? root.status : null);
    }
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

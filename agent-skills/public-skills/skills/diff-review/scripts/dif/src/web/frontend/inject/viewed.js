// dif web shell: GitHub viewed files -> difit. Concatenated after inject.js into
// the one injected script; it has its own scope.
(function () {
  "use strict";
  // ===== Applying GitHub's viewed state to difit =====
  // The poller pulls the reviewer's per-file viewed state from the PR and the
  // shell serves the changes as numbered events in `/__wrap/github.json`
  // (`viewed.events`). This applies the ones not yet applied, by writing
  // difit's own storage the way difit does, then reloads this frame once no
  // comment draft is open so difit re-reads it. The opposite direction (difit
  // -> GitHub) lives in the shell, which sees difit's writes as storage events.
  //
  // difit's storage (all per origin, and each review has its own origin):
  //   - `difit-viewed-index-v1/<repositoryId>`: { version: 1, entries: [{
  //     filePath, diffContentHash, hashVersion: 1, viewedAt }] }. On load,
  //     difit marks a file viewed when an entry matches its current diff hash.
  //   - `difit-storage-v1/<repositoryId>/<comparison>`: per-comparison data
  //     whose `viewedFiles` list also marks files viewed.
  // The hash is SHA-256 over the file's path, status, and hunks, exactly as
  // difit builds it, from the same `/api/diff` query difit itself made (the
  // whitespace option changes the hunks).
  var INDEX_PREFIX = "difit-viewed-index-v1/";
  var CONTEXT_PREFIX = "difit-storage-v1/";
  var SEQ_KEY = "dif-gh-viewed-seq";
  var lastDiffQuery = "ignoreWhitespace=true";
  var applying = false;
  var reloadPending = false;

  // Remember the query of difit's own /api/diff requests.
  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    try {
      var parsed = new URL(url, window.location.href);
      if (parsed.pathname === "/api/diff") lastDiffQuery = parsed.search.replace(/^\?/, "");
    } catch (err) { /* not a URL we care about */ }
    return nativeFetch(input, init);
  };

  function readJson(key) {
    try { return JSON.parse(window.localStorage.getItem(key) || "null"); } catch (err) { return null; }
  }
  function writeJson(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* quota */ }
  }
  function keysWithPrefix(prefix) {
    return Object.keys(window.localStorage).filter(function (key) {
      return key.lastIndexOf(prefix, 0) === 0;
    });
  }

  // difit's per-file diff text, hashed with SHA-256 (hex).
  function diffText(file) {
    var chunks = (file.chunks || []).map(function (chunk) {
      var lines = (chunk.lines || [])
        .filter(function (line) { return line.type !== "hunk" && line.type !== "header"; })
        .map(function (line) { return line.type + ":" + line.content; })
        .join("\n");
      return chunk.header + "\n" + lines;
    }).join("\n\n");
    return file.path + "\n" + file.status + "\n" + chunks;
  }
  function sha256(text) {
    return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)).then(function (digestBuffer) {
      return Array.from(new Uint8Array(digestBuffer))
        .map(function (byteValue) { return byteValue.toString(16).padStart(2, "0"); })
        .join("");
    });
  }

  // The full, unfiltered diff (no referrer, so the shell does not narrow it to
  // this frame's group).
  function fetchFullDiff() {
    return nativeFetch("/api/diff?" + lastDiffQuery, { cache: "no-store", referrerPolicy: "no-referrer" })
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(new Error("diff " + response.status));
      });
  }

  function markViewed(repositoryId, file) {
    return sha256(diffText(file)).then(function (hash) {
      var key = INDEX_PREFIX + repositoryId;
      var index = readJson(key) || { version: 1, entries: [] };
      if (!Array.isArray(index.entries)) index.entries = [];
      var present = index.entries.some(function (entry) {
        return entry.filePath === file.path && entry.diffContentHash === hash;
      });
      if (present) return false;
      index.entries.push({ filePath: file.path, diffContentHash: hash, hashVersion: 1, viewedAt: new Date().toISOString() });
      index.lastModifiedAt = new Date().toISOString();
      writeJson(key, index);
      return true;
    });
  }

  function unmarkViewed(repositoryId, path) {
    var changed = false;
    keysWithPrefix(INDEX_PREFIX + repositoryId).forEach(function (key) {
      var index = readJson(key);
      if (!index || !Array.isArray(index.entries)) return;
      var kept = index.entries.filter(function (entry) { return entry.filePath !== path; });
      if (kept.length === index.entries.length) return;
      index.entries = kept;
      writeJson(key, index);
      changed = true;
    });
    keysWithPrefix(CONTEXT_PREFIX + repositoryId + "/").forEach(function (key) {
      var context = readJson(key);
      if (!context || !Array.isArray(context.viewedFiles)) return;
      var kept = context.viewedFiles.filter(function (viewedFile) { return viewedFile.filePath !== path; });
      if (kept.length === context.viewedFiles.length) return;
      context.viewedFiles = kept;
      writeJson(key, context);
      changed = true;
    });
    return changed;
  }

  function appliedSeq(sessionId) {
    var saved = readJson(SEQ_KEY);
    return saved && saved.session === sessionId ? saved.seq : 0;
  }

  // The newest event per path, after `from`.
  function latestChanges(events, from) {
    var byPath = {};
    events.forEach(function (event) { if (event.seq > from) byPath[event.path] = event; });
    return Object.keys(byPath).map(function (path) { return byPath[path]; });
  }

  // A comment being typed would be lost by a reload, so wait for it.
  function hasDraft() {
    return Array.from(document.querySelectorAll("form textarea")).some(function (textarea) {
      return textarea.value.trim() !== "";
    });
  }
  function reloadWhenSafe() {
    if (reloadPending) return;
    reloadPending = true;
    (function attempt() {
      if (hasDraft()) { window.setTimeout(attempt, 2000); return; }
      window.location.reload();
    })();
  }

  function apply(state) {
    var viewed = state && state.viewed;
    if (applying || !viewed || !viewed.active || !Array.isArray(viewed.events)) return;
    var from = appliedSeq(state.sessionId);
    var changes = latestChanges(viewed.events, from);
    if (!changes.length) return;
    var newest = viewed.events[viewed.events.length - 1].seq;
    applying = true;
    fetchFullDiff().then(function (diff) {
      var files = {};
      (diff.files || []).forEach(function (file) { files[file.path] = file; });
      var repositoryId = diff.repositoryId;
      var steps = changes.map(function (change) {
        if (!files[change.path] || !repositoryId) return Promise.resolve(false);
        return change.viewed
          ? markViewed(repositoryId, files[change.path])
          : Promise.resolve(unmarkViewed(repositoryId, change.path));
      });
      return Promise.all(steps).then(function (results) {
        writeJson(SEQ_KEY, { session: state.sessionId, seq: newest });
        if (results.some(Boolean)) reloadWhenSafe();
      });
    }).catch(function () { /* retry on the next poll */ })
      .then(function () { applying = false; });
  }

  function poll() {
    nativeFetch("/__wrap/github.json", { cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
      .then(apply)
      .catch(function () { /* the next poll retries */ });
  }
  poll();
  window.setInterval(poll, 2000);
})();

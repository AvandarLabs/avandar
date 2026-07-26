// dif web shell — injected into difit's document by the proxy.
//
// difit runs behind a single origin, so its "viewed" localStorage index
// (`difit-viewed-index-v1/<diffIdentity>`) is shared across the Full view and
// every group view. difit reads that index on load but does not react to
// cross-document writes. In the single-iframe model (v1) there is only one
// difit document at a time, so switching views reloads it and it re-reads the
// shared index for free — this listener stays dormant. It becomes load-bearing
// in the multi-iframe upgrade, where a "viewed" toggle in one frame must show
// in the others: on such a cross-frame write we reload this frame to reflect it.
(function () {
  "use strict";
  var VIEWED_PREFIX = "difit-viewed-index-v1/";
  var reloadTimer = null;
  window.addEventListener("storage", function (event) {
    if (!event.key || event.key.lastIndexOf(VIEWED_PREFIX, 0) !== 0) {
      return;
    }
    // Debounce a burst of writes (several files marked at once) into one reload.
    window.clearTimeout(reloadTimer);
    reloadTimer = window.setTimeout(function () {
      window.location.reload();
    }, 400);
  });

  // Let the shell know difit finished booting inside this frame, so it can drop
  // any loading affordance. Same-origin, so this is a direct, safe post.
  function toParent(msg) {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, window.location.origin);
      }
    } catch (err) {
      /* no parent / cross-origin: nothing to notify */
    }
  }
  toParent({ source: "dif-web-shell", type: "difit-ready" });

  // Receive requests from the shell (same-origin parent). Today: scroll this
  // difit view to a file — the shell can't reach into difit's DOM directly, but
  // we can, and difit tags each file element with `data-file-path`.
  //
  // The shell fires this right after `difit-ready`, which we post as soon as
  // this script runs — *before* difit's React has rendered the file rows. So the
  // target element may not exist yet on the first paint (that's why it used to
  // take a second click). Retry briefly until difit renders the row, then scroll.
  function scrollToFile(path, triesLeft) {
    var nodes = document.querySelectorAll("[data-file-path]");
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute("data-file-path") === path) {
        nodes[i].scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      }
    }
    if (triesLeft > 0) {
      window.setTimeout(function () { scrollToFile(path, triesLeft - 1); }, 75);
    }
  }
  // difit renders its own "reload" button when it detects the working tree
  // changed (via its /api/watch SSE). The button's title always ends with
  // "- Click to refresh" (literal text in difit, stable across builds), so we
  // can find it, report its presence to the shell, and click it on request —
  // difit reloads the diff IN PLACE (no iframe reload → an in-progress comment
  // survives, and no server restart / new browser tab).
  function reloadButton() {
    return document.querySelector('button[title*="Click to refresh"]');
  }

  window.addEventListener("message", function (event) {
    if (event.origin !== window.location.origin) return;
    var d = event.data;
    if (!d || d.source !== "dif-web-shell") return;
    if (d.type === "scroll-to-file" && d.path) {
      scrollToFile(d.path, 40); // ~3s: covers difit's first render after boot
    } else if (d.type === "reload-difit") {
      var btn = reloadButton();
      if (btn) btn.click(); // difit's in-place reload
    }
  });

  // If the user clicks difit's OWN reload button (not our "Show new changes"),
  // difit reloads in place — tell the shell so it rebaselines + refreshes the
  // guide, making that click double as "Show new changes".
  document.addEventListener("click", function (e) {
    var t = e.target;
    var btn = t && t.closest ? t.closest('button[title*="Click to refresh"]') : null;
    if (btn) toParent({ source: "dif-web-shell", type: "difit-reloaded" });
  }, true);

  // Tell the shell when difit is offering a reload (changes detected) so it can
  // show a "Show new changes" affordance. Poll once a second and post on change.
  var lastAvail = null;
  window.setInterval(function () {
    var avail = !!reloadButton();
    if (avail !== lastAvail) {
      lastAvail = avail;
      toParent({ source: "dif-web-shell", type: "changes-available", available: avail });
    }
  }, 1000);

  // Forward the shell's hotkeys. A keydown inside this iframe never bubbles to
  // the parent document, so the shell's own listener can't see it while focus
  // is in difit. We detect the same combos here and post the intent up: Mod+K
  // (⌘K on macOS, Ctrl+K elsewhere) toggles the palette; Ctrl+1..9 jumps to a
  // group; Ctrl+F shows the full diff. Never fire while the user is typing (so
  // difit's comment boxes and any emacs-style Ctrl keys keep working).
  var IS_MAC = /Mac|iP(hone|ad|od)/.test(
    (navigator.platform || "") + " " + (navigator.userAgent || "")
  );
  function isEditable(t) {
    if (!t) return false;
    var tag = (t.tagName || "").toUpperCase();
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable === true;
  }
  function combo(e) {
    var mod = IS_MAC ? e.metaKey : e.ctrlKey;
    if (mod && !e.altKey && (e.key === "k" || e.key === "K")) return { type: "spotlight" };
    if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && /^Digit[1-9]$/.test(e.code)) {
      return { type: "group", n: parseInt(e.code.slice(5), 10) };
    }
    if (e.ctrlKey && !e.metaKey && !e.altKey && (e.key === "f" || e.key === "F")) {
      return { type: "full" };
    }
    if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key === "h" || e.key === "H")) {
      return { type: "toggle-side" };
    }
    return null;
  }
  window.addEventListener("keydown", function (e) {
    var c = combo(e);
    if (!c) return;
    // The palette is navigation, safe to open even from a field; the plain-Ctrl
    // group/full jumps must never steal keystrokes mid-edit.
    if (c.type !== "spotlight" && isEditable(e.target || document.activeElement)) return;
    e.preventDefault();
    toParent({ source: "dif-web-shell", type: "hotkey", combo: c });
  });
})();

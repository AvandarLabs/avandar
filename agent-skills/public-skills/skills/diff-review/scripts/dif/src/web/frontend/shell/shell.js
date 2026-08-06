// dif web shell — the sidebar-as-nav + single difit iframe.
//
// The guide sidebar is driven by /__wrap/groups.json (the skill's -guide.json).
// Selecting Full or a group points the one iframe at the proxied difit URL for
// that view; difit re-boots and fetches the filtered /api/diff (the proxy reads
// the group from this frame's Referer). One difit process, one origin, so
// "viewed" state and comments are shared across every view.
//
// Because the shell page and the difit iframe are the SAME origin, difit's own
// "viewed" localStorage index is observable here: difit's writes fire a
// `storage` event in this parent document, so the sidebar checks + progress
// bars mirror difit live, with no difit changes and no polling.
//
// Chrome extras: the header title is the branch (with a worktree pill when the
// checkout dir differs), a command palette (spotlight) navigates views/groups/
// files, and hotkeys (Ctrl+1..9 groups, Ctrl+F full, Mod+K palette) jump around
// even when focus is inside the difit iframe (forwarded via inject.js).
//
// SOURCE LAYOUT — this frontend is split into logical fragments under
// `frontend/shell/`, concatenated IN ORDER by the Rust server (see `SHELL_JS`
// in `src/web/server.rs`) into one script served at `/__wrap/shell.js`. They
// share ONE IIFE and one closure scope: THIS file opens the IIFE and declares
// all shared state + DOM refs (the entry point); the feature files
// (`tooltip.js`, `helpers.js`, `iframe.js`, `render.js`, `data.js`,
// `spotlight.js`, `hotkeys.js`, `chrome.js`) add behavior; `boot.js` runs the
// startup sequence and closes the IIFE. Ordering only requires `shell.js` first
// and `boot.js` last — the middle files are hoisted function/listener
// definitions and may be reordered freely. Each middle file is a fragment, not
// standalone-valid; lint/parse the assembled `/__wrap/shell.js`, not the parts.
(function () {
  "use strict";

  var groups = [];
  var view = "full"; // "full" | "g<n>" | "new"
  var sideMode = "guide"; // "guide" | "test-plan"
  var collapsedGroups = {};
  var lastGroupsJson = "";
  var lastSummaryText = "";
  var lastTestPlanText = "";
  var diffSummary = "";
  var testPlan = "";
  var difitReady = false;
  var readyTimer = null;
  var pendingScroll = null;

  // Authoritative file list from difit's real /api/diff (the diff can change
  // while reviewing — new files appear, counts shift). The guide is curation;
  // difit is the source of truth for "which files are in the diff right now".
  var diffPaths = [];   // array of repo-relative paths
  var diffLoaded = false;

  // Silent auto-retry of the difit iframe: after a Ctrl+R restart difit is
  // briefly down, so the first load can 502. Retry a few times before showing
  // the manual "difit didn't load" box.
  var RETRY_MAX = 12;
  var RETRY_DELAY = 500; // ms
  var attempts = 0;
  var retryTimer = null;

  // "Show new changes" is driven by an ACTUAL diff-content change, not difit's
  // own reload signal — difit's file-watcher fires on git-internal churn
  // (`.git/HEAD`, `.git/index`, …) that doesn't change the diff, which would
  // otherwise show the button spuriously. We hash difit's live `/api/diff` and
  // compare it to the diff difit's iframe is currently showing.
  var changesAvailable = false;
  var renderedDiffSig = null; // sig of the diff difit's iframe is displaying
  var liveDiffSig = null;     // sig of the latest fetched /api/diff
  // While `now < baselineUntil` we keep (re)baselining `renderedDiffSig` to the
  // latest fetch. This absorbs difit's warmup: right after launch / a reload its
  // /api/diff can return a partial or still-settling result, and we must not
  // freeze the baseline on that (it would make every later fetch read as "new").
  var baselineUntil = 0;
  // A guide regeneration is in flight (button disabled until the guide updates)
  // so we never queue more than one regen at a time.
  var regenInFlight = false;

  // difit's viewed index lives under this localStorage prefix; we mirror it.
  var VIEWED_PREFIX = "difit-viewed-index-v1/";
  var liveViewed = {}; // path -> true, difit's own "viewed" marks (localStorage)
  // difit ALSO auto-marks generated + deleted files as viewed (they need no
  // review), without writing them to localStorage. We mirror that from the
  // /api/diff `isGenerated` / `status` fields so our counts match difit's.
  var autoViewed = {}; // path -> true
  var THEME_KEY = "dif-shell-theme";

  var IS_MAC = /Mac|iP(hone|ad|od)/.test(
    (navigator.platform || "") + " " + (navigator.userAgent || "")
  );

  var els = {
    body: document.getElementById("bodyEl"),
    sideScroll: document.getElementById("sideScroll"),
    sideProg: document.getElementById("sideProg"),
    rail: document.getElementById("rail"),
    viewInfo: document.getElementById("viewInfo"),
    viewProg: document.getElementById("viewProg"),
    iframe: document.getElementById("difit"),
    loading: document.getElementById("loading"),
    ifrError: document.getElementById("ifrError"),
    ifrRetry: document.getElementById("ifrRetry"),
    regenBtn: document.getElementById("regenBtn"),
    guideTab: document.getElementById("guideTab"),
    testPlanTab: document.getElementById("testPlanTab"),
    showChangesBtn: document.getElementById("showChangesBtn"),
    brandTitle: document.getElementById("brandTitle"),
    worktreePill: document.getElementById("worktreePill"),
    cmdBtn: document.getElementById("cmdBtn"),
    cmdKbd: document.getElementById("cmdKbd"),
    spotlight: document.getElementById("spotlight"),
    slInput: document.getElementById("slInput"),
    slList: document.getElementById("slList"),
    slBackdrop: document.getElementById("slBackdrop"),
    tip: document.getElementById("tip"),
  };

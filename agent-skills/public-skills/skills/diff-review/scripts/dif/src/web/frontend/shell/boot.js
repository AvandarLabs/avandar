  // ===== boot =====
  // Fragment concatenated LAST into the IIFE opened in shell.js — it runs the
  // startup sequence and closes the IIFE. See shell.js for the module map.
  try { applyTheme(window.localStorage.getItem(THEME_KEY)); } catch (e) { /* ignore */ }
  els.cmdKbd.textContent = IS_MAC ? "⌘K" : "Ctrl K";
  readLiveViewed();
  initViewedSync(); // later difit viewed changes are sent to GitHub
  baselineUntil = nowMs() + 2500; // absorb difit's cold-start /api/diff settling
  selectView("full"); // mount difit immediately; the guide fills in around it
  fetchMeta();
  fetchGroups();
  fetchSummary();
  fetchTestPlan();
  fetchDiff(); // authoritative file counts + "new files not in guide"
  fetchDispatch(); // bulk vs eager delivery + held comment count
  fetchGithub(); // the linked PR, drafts, sync state
  window.setInterval(fetchGroups, 3000); // reflect the skill regenerating the guide
  window.setInterval(fetchSummary, 3000);
  window.setInterval(fetchTestPlan, 3000);
  window.setInterval(fetchDiff, 3000);   // keep counts + new-files + show-changes in sync
  window.setInterval(fetchDispatch, 1500); // the held count changes as comments are saved
  window.setInterval(fetchGithub, 2000);
})();

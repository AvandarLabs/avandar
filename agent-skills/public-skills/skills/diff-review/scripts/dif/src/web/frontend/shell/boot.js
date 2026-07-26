  // ===== boot =====
  // Fragment concatenated LAST into the IIFE opened in shell.js — it runs the
  // startup sequence and closes the IIFE. See shell.js for the module map.
  try { applyTheme(window.localStorage.getItem(THEME_KEY)); } catch (e) { /* ignore */ }
  els.cmdKbd.textContent = IS_MAC ? "⌘K" : "Ctrl K";
  readLiveViewed();
  baselineUntil = nowMs() + 2500; // absorb difit's cold-start /api/diff settling
  selectView("full"); // mount difit immediately; the guide fills in around it
  fetchMeta();
  fetchGroups();
  fetchDiff(); // authoritative file counts + "new files not in guide"
  window.setInterval(fetchGroups, 3000); // reflect the skill regenerating the guide
  window.setInterval(fetchDiff, 3000);   // keep counts + new-files + show-changes in sync
})();

  // ===== tips: what each control in the shell does =====
  // Fragment concatenated into the IIFE opened in shell.js. See that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // Static controls get their tooltip text here, since it names platform
  // hotkeys and so can't live in the HTML. Controls whose meaning changes with
  // state set `data-tip` where they render: the GitHub bar (github.js), the
  // With comments toggle (commented.js), Send all (dispatch.js), the branch and
  // worktree (data.js), and the sidebar, rail, and view header (render.js).
  var SEND_NOW_KEYS = IS_MAC ? "⌘⌥↵" : "Ctrl+Alt+Enter";

  function setTip(el, text) {
    if (!el) return;
    if (text) el.setAttribute("data-tip", text);
    else el.removeAttribute("data-tip");
  }
  function hotkeyHint(key) { return " (" + platformHotkeyLabel(key) + ")"; }

  function applyChromeTips() {
    setTip(document.getElementById("toggleSide"), "Show or hide the diff guide sidebar" + hotkeyHint("H"));
    setTip(els.showChangesBtn, "The code changed since difit loaded it. Reload the diff and the guide in place; a comment you are typing is kept.");
    setTip(document.querySelector('#dispatchMode [data-mode="bulk"]'),
      "Bulk (the default): comments you send to the TUI are held until you press Send all, then reach the LLM together as one prompt. Fewer prompts, fewer tokens.\n"
      + "In a TUI comment box, " + SEND_NOW_KEYS + " sends just that comment right away.");
    setTip(document.querySelector('#dispatchMode [data-mode="eager"]'),
      "Eager: each comment you send to the TUI is typed into the LLM as soon as you save it, one prompt per comment.\n"
      + "Switching to Eager also sends anything still held.");
    setTip(els.cmdBtn, "Command palette: jump to a group, file, or view, or run an action (" + (IS_MAC ? "⌘K" : "Ctrl+K") + ")");
    setTip(document.getElementById("themeBtn"), "Switch between the light and dark theme");
    setTip(els.regenBtn, "A file was added to or removed from the diff since the guide was written. Ask the LLM to regenerate the guide (runs /diff-review in the TUI).");
    setTip(document.getElementById("collapseBtn"), "Collapse the sidebar to a rail of group numbers" + hotkeyHint("H"));
    setTip(els.guideTab, "The diff guide: a summary, then the change split into groups to review in order" + hotkeyHint("D"));
    setTip(els.testPlanTab, "The manual test plan: steps to check the change by hand" + hotkeyHint("T"));
    setTip(els.ifrRetry, "Try loading difit again");
  }

  // ===== conflicts: who resolves a GitHub sync's merge conflicts =====
  // Fragment concatenated into the IIFE opened in shell.js. See that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // Sync stashes the reviewer's local changes, pulls the PR's new commits, and
  // restores the changes. When restoring conflicts, /__wrap/github.json carries
  // the conflicted files until the reviewer answers this modal: resolve them by
  // hand, or have the TUI type a resolve request into the LLM pane. Escape
  // counts as "I'll resolve them", so the modal never returns unanswered.
  var cfEls = {
    dialog: document.getElementById("ghConflicts"),
    sub: document.getElementById("ghConflictsSub"),
    files: document.getElementById("ghConflictsFiles"),
    reviewer: document.getElementById("ghConflictsReviewer"),
    llm: document.getElementById("ghConflictsLlm"),
  };
  var shownConflicts = "";    // the file list the open modal asks about
  var answeredConflicts = ""; // answered here, until github.json catches up

  function renderConflicts(files) {
    var key = Array.isArray(files) ? files.join("\n") : "";
    if (!key) {
      answeredConflicts = "";
      if (cfEls.dialog.open) cfEls.dialog.close(); // answered in another tab
      return;
    }
    if (key === answeredConflicts || cfEls.dialog.open) return;
    shownConflicts = key;
    cfEls.sub.textContent = "Pulling the PR's new commits worked, but putting your local changes back on top conflicted in "
      + plural(files.length, "file") + ". Git kept your changes in the stash.";
    cfEls.files.innerHTML = files.map(function (file) { return "<li>" + esc(file) + "</li>"; }).join("");
    cfEls.dialog.showModal();
  }

  function answerConflicts(resolve) {
    answeredConflicts = shownConflicts;
    if (cfEls.dialog.open) cfEls.dialog.close();
    fetch("/__wrap/github/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolve: resolve }),
    }).then(fetchGithub, fetchGithub);
  }

  cfEls.llm.addEventListener("click", function () { answerConflicts("llm"); });
  cfEls.reviewer.addEventListener("click", function () { answerConflicts("reviewer"); });
  cfEls.dialog.addEventListener("cancel", function (event) {
    event.preventDefault();
    answerConflicts("reviewer");
  });

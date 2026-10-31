  // ===== dispatch: bulk vs eager comment delivery + "Send all" =====
  // Fragment concatenated into the IIFE opened in shell.js. See that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // In bulk mode (the default) the TUI holds reviewer comments instead of typing
  // each into the LLM pane; "Send all" flushes them as one prompt. Eager mode
  // sends each comment as soon as it is saved. Switching to eager sends anything
  // still held. The server owns the state (`/__wrap/dispatch.json`); the TUI
  // reports how many comments are held, which this polls.
  var dispatchState = { mode: "bulk", queued: 0 };
  var sendAllInFlight = false;
  var dispatchEls = {
    modeBtns: document.querySelectorAll("#dispatchMode [data-mode]"),
    sendAll: document.getElementById("sendAllBtn"),
    count: document.getElementById("sendAllCount"),
  };

  function renderDispatch() {
    var bulk = dispatchState.mode === "bulk";
    // A roving tabindex: only the checked radio is in the tab order.
    dispatchEls.modeBtns.forEach(function (modeButton) {
      var isChecked = modeButton.getAttribute("data-mode") === dispatchState.mode;
      modeButton.classList.toggle("active", isChecked);
      modeButton.setAttribute("aria-checked", isChecked ? "true" : "false");
      modeButton.tabIndex = isChecked ? 0 : -1;
    });
    if (!dispatchEls.sendAll) return;
    var queued = dispatchState.queued || 0;
    if (!queued) sendAllInFlight = false;
    dispatchEls.sendAll.hidden = !bulk || !queued;
    dispatchEls.sendAll.disabled = sendAllInFlight;
    dispatchEls.count.textContent = String(queued);
  }

  function applyDispatch(state) {
    if (!state || (state.mode !== "bulk" && state.mode !== "eager")) return;
    dispatchState = state;
    renderDispatch();
  }

  function fetchDispatch() {
    fetch("/__wrap/dispatch.json", { cache: "no-store" })
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(new Error("dispatch " + response.status));
      })
      .then(applyDispatch)
      .catch(function () { /* keep the last known state */ });
  }

  function setDispatchMode(mode) {
    if (mode === dispatchState.mode) return;
    fetch("/__wrap/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: mode }),
    })
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(new Error("dispatch " + response.status));
      })
      .then(applyDispatch)
      .catch(function () { /* the next poll shows the real state */ });
  }

  // The TUI clears the queue on its next tick, so the button stays disabled
  // until the poll reports nothing held (or a safety timeout re-arms it).
  function sendAllComments() {
    if (sendAllInFlight || !dispatchState.queued) return;
    sendAllInFlight = true;
    renderDispatch();
    window.setTimeout(function () { sendAllInFlight = false; renderDispatch(); }, 10000);
    fetch("/__wrap/send-all", { method: "POST" })
      .then(function (response) {
        if (!response.ok) throw new Error("send-all " + response.status);
        fetchDispatch();
      })
      .catch(function () { sendAllInFlight = false; renderDispatch(); });
  }

  dispatchEls.modeBtns.forEach(function (modeButton) {
    modeButton.addEventListener("click", function () { setDispatchMode(modeButton.getAttribute("data-mode")); });
  });
  // Arrow keys move the selection between the two delivery modes, as the ARIA
  // radio group pattern expects.
  var dispatchGroup = document.getElementById("dispatchMode");
  if (dispatchGroup) {
    dispatchGroup.addEventListener("keydown", function (event) {
      var step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
      if (!step) return;
      event.preventDefault();
      var modeButtons = Array.from(dispatchEls.modeBtns);
      var current = modeButtons.findIndex(function (modeButton) {
        return modeButton.getAttribute("data-mode") === dispatchState.mode;
      });
      var target = modeButtons[(current + step + modeButtons.length) % modeButtons.length];
      setDispatchMode(target.getAttribute("data-mode"));
      target.focus();
    });
  }
  if (dispatchEls.sendAll) dispatchEls.sendAll.addEventListener("click", sendAllComments);

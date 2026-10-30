  // ===== dispatch: bulk vs eager comment delivery + "Send all" =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
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
    Array.prototype.forEach.call(dispatchEls.modeBtns, function (btn) {
      var on = btn.getAttribute("data-mode") === dispatchState.mode;
      btn.classList.toggle("active", on);
      btn.setAttribute("aria-checked", on ? "true" : "false");
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
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("dispatch " + r.status)); })
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
      .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("dispatch " + r.status)); })
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
      .then(function (r) { if (!r.ok) throw new Error("send-all " + r.status); fetchDispatch(); })
      .catch(function () { sendAllInFlight = false; renderDispatch(); });
  }

  Array.prototype.forEach.call(dispatchEls.modeBtns, function (btn) {
    btn.addEventListener("click", function () { setDispatchMode(btn.getAttribute("data-mode")); });
  });
  if (dispatchEls.sendAll) dispatchEls.sendAll.addEventListener("click", sendAllComments);

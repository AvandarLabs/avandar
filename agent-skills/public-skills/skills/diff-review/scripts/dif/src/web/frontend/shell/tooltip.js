  // ===== hover tooltip (full file paths + truncated notes) =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // Elements opt in with `data-tip="<text>"`. `data-tip-trunc` shows the tip
  // only when the element is actually ellipsized (the note case); otherwise it
  // shows on hover regardless (the file-path case).
  function showTip(el) {
    var text = el.getAttribute("data-tip");
    if (!text || !els.tip) return;
    if (el.hasAttribute("data-tip-trunc") && el.scrollWidth <= el.clientWidth + 1) return;
    els.tip.textContent = text;
    els.tip.hidden = false;
    var r = el.getBoundingClientRect();
    var tw = els.tip.offsetWidth, th = els.tip.offsetHeight;
    var left = Math.min(Math.max(6, r.left), window.innerWidth - tw - 6);
    var top = r.bottom + 6;
    if (top + th > window.innerHeight - 6) top = r.top - th - 6; // flip above near the edge
    els.tip.style.left = left + "px";
    els.tip.style.top = Math.max(6, top) + "px";
  }
  function hideTip() { if (els.tip) els.tip.hidden = true; }
  els.sideScroll.addEventListener("mouseover", function (e) {
    var el = e.target.closest ? e.target.closest("[data-tip]") : null;
    if (el) showTip(el); else hideTip();
  });
  els.sideScroll.addEventListener("mouseout", function (e) {
    var to = e.relatedTarget;
    if (!to || !to.closest || !to.closest("[data-tip]")) hideTip();
  });
  els.sideScroll.addEventListener("scroll", hideTip, { passive: true });

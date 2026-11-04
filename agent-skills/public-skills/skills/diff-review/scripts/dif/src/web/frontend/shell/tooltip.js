  // ===== hover tooltip: one styled tip for the whole shell =====
  // Fragment concatenated into the IIFE opened in shell.js — see that file for
  // the module map. Not standalone-valid; parse the assembled shell.js.
  //
  // Elements opt in with `data-tip="<text>"` (line breaks are kept).
  // `data-tip-trunc` shows the tip only when the element is actually
  // ellipsized (a file note, the GitHub notice); otherwise it shows on hover
  // and on keyboard focus. Delegated on the document, so the header, sidebar,
  // and rail share one tip; while it shows, it describes its element for
  // screen readers. The shell uses this instead of native `title` tooltips,
  // which are slow to appear and unstyled.
  var tipTarget = null;
  function showTip(el) {
    var text = el.getAttribute("data-tip");
    if (!text || !els.tip) return;
    if (el.hasAttribute("data-tip-trunc") && el.scrollWidth <= el.clientWidth + 1) { hideTip(); return; }
    if (tipTarget && tipTarget !== el) tipTarget.removeAttribute("aria-describedby");
    tipTarget = el;
    el.setAttribute("aria-describedby", "tip");
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
  function hideTip() {
    if (tipTarget) tipTarget.removeAttribute("aria-describedby");
    tipTarget = null;
    if (els.tip) els.tip.hidden = true;
  }
  function tipHost(node) { return node && node.closest ? node.closest("[data-tip]") : null; }
  document.addEventListener("mouseover", function (e) {
    var el = tipHost(e.target);
    if (!el) hideTip();
    else if (el !== tipTarget) showTip(el);
  });
  document.addEventListener("mouseout", function (e) { if (!e.relatedTarget) hideTip(); });
  document.addEventListener("focusin", function (e) {
    var el = tipHost(e.target);
    if (el && e.target.matches(":focus-visible")) showTip(el);
  });
  document.addEventListener("focusout", hideTip);
  document.addEventListener("mousedown", hideTip, true);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hideTip(); });
  els.sideScroll.addEventListener("scroll", hideTip, { passive: true });

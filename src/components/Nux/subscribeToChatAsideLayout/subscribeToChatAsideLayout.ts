import { CHAT_PANEL_ASIDE_SELECTOR } from "@/config/AppShellLayout.constants";

/**
 * True when this event is the AppShell aside's slide (`transform`).
 *
 * Tests dispatch a plain `Event` with `propertyName` set; the browser sends
 * a `TransitionEvent`. Both have `propertyName`.
 */
function _isAsideTransformTransition(event: Event): boolean {
  return "propertyName" in event && event.propertyName === "transform";
}

function _onAsideTransformTransition(options: {
  event: Event;
  onLayoutChange: () => void;
  tickWhileSliding: boolean;
  animationFrame: { id: number };
}): void {
  const { event, onLayoutChange, tickWhileSliding, animationFrame } = options;
  if (!_isAsideTransformTransition(event)) {
    return;
  }
  const stopTicking = (): void => {
    window.cancelAnimationFrame(animationFrame.id);
    animationFrame.id = 0;
  };
  if (event.type === "transitionrun") {
    onLayoutChange();
    if (!tickWhileSliding) {
      return;
    }
    const tick = (): void => {
      onLayoutChange();
      animationFrame.id = window.requestAnimationFrame(tick);
    };
    stopTicking();
    animationFrame.id = window.requestAnimationFrame(tick);
    return;
  }
  stopTicking();
  onLayoutChange();
}

type SubscribeToChatAsideLayoutOptions = {
  /**
   * When true (default), `onLayoutChange` runs every animation frame while
   * the aside is sliding, so the checklist can track the visible width.
   * When false, it runs once at the start and once at the end: Joyride
   * coalesces window `resize` for 100ms, so per-frame pings would stall
   * the spotlight until the slide finished.
   */
  tickWhileSliding?: boolean;
};

/**
 * Calls `onLayoutChange` whenever the chat aside's on-screen width changes.
 *
 * AppShell slides the aside with a CSS transform, which does not fire
 * `ResizeObserver` on the aside or a window `resize`. The checklist docks
 * against that motion, and the tour spotlight must remeasure with it.
 */
export function subscribeToChatAsideLayout(
  onLayoutChange: () => void,
  options: SubscribeToChatAsideLayoutOptions = {},
): () => void {
  const tickWhileSliding = options.tickWhileSliding !== false;
  const aside = document.querySelector(CHAT_PANEL_ASIDE_SELECTOR);
  if (!(aside instanceof HTMLElement)) {
    onLayoutChange();
    return () => {};
  }

  const animationFrame = { id: 0 };
  const onTransition = (event: Event): void => {
    _onAsideTransformTransition({
      event,
      onLayoutChange,
      tickWhileSliding,
      animationFrame,
    });
  };

  onLayoutChange();
  const resizeObserver = new ResizeObserver(onLayoutChange);
  resizeObserver.observe(aside);
  aside.addEventListener("transitionrun", onTransition);
  aside.addEventListener("transitionend", onTransition);

  return () => {
    window.cancelAnimationFrame(animationFrame.id);
    resizeObserver.disconnect();
    aside.removeEventListener("transitionrun", onTransition);
    aside.removeEventListener("transitionend", onTransition);
  };
}

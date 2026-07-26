import { useLayoutEffect, useRef } from "react";
import { shouldAutoFocusFloatingPanelOnOpen } from "@/components/FloatingPanel/shouldAutoFocusFloatingPanelOnOpen";
import { AnimationTheme } from "@/config/Theme";
import type { RefObject } from "react";

const APP_SHELL_ASIDE_TRANSITION_FALLBACK_MS =
  AnimationTheme.durationMs.normal + 40;

type Options = {
  isOpen: boolean;
  panelRef: RefObject<HTMLElement | null>;
  composerInputRef: RefObject<HTMLTextAreaElement | null>;
};

/**
 * Focuses the chat composer after the AppShell Aside slide-in finishes.
 * Skips when the panel was already open on mount or the user is typing
 * elsewhere.
 */
export function useChatPanelComposerAutoFocus({
  isOpen,
  panelRef,
  composerInputRef,
}: Options): void {
  const prevIsOpenRef = useRef(isOpen);
  const hasAutoFocusedThisOpenRef = useRef(false);

  useLayoutEffect(() => {
    const wasOpen = prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (!isOpen) {
      hasAutoFocusedThisOpenRef.current = false;
      return;
    }

    if (wasOpen || hasAutoFocusedThisOpenRef.current) {
      return;
    }

    // Guard + handles so the effect can tear down its pending listener,
    // timeout, and animation-frame recursion when `isOpen` flips or the
    // component unmounts before the aside transition completes.
    let cancelled = false;
    let rafId: number | undefined;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let boundAside: HTMLElement | undefined;

    const focusComposer = (): void => {
      if (cancelled) {
        return;
      }
      const panel = panelRef.current;
      const input = composerInputRef.current;
      if (!panel || !input || input.disabled) {
        hasAutoFocusedThisOpenRef.current = true;
        return;
      }

      const focusScope = panel.closest("aside") ?? panel;
      if (!shouldAutoFocusFloatingPanelOnOpen(focusScope)) {
        hasAutoFocusedThisOpenRef.current = true;
        return;
      }

      input.focus({ preventScroll: true });
      hasAutoFocusedThisOpenRef.current = true;
    };

    const teardownAsideListeners = (): void => {
      if (boundAside) {
        boundAside.removeEventListener("transitionend", onTransitionEnd);
        boundAside = undefined;
      }
      if (fallbackTimeoutId != null) {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = undefined;
      }
    };

    const onTransitionEnd = (event: TransitionEvent): void => {
      if (event.target !== boundAside || event.propertyName !== "transform") {
        return;
      }

      teardownAsideListeners();
      focusComposer();
    };

    const waitForAsideTransitionEnd = (): void => {
      if (cancelled) {
        return;
      }
      const aside = panelRef.current?.closest("aside");
      if (!aside) {
        rafId = requestAnimationFrame(waitForAsideTransitionEnd);
        return;
      }

      boundAside = aside;
      aside.addEventListener("transitionend", onTransitionEnd);
      fallbackTimeoutId = setTimeout(() => {
        teardownAsideListeners();
        focusComposer();
      }, APP_SHELL_ASIDE_TRANSITION_FALLBACK_MS);

      const { transitionDuration, transform } = getComputedStyle(aside);
      const hasNoTransformTransition =
        transitionDuration === "0s" ||
        transitionDuration === "0ms" ||
        transform === "none";

      if (hasNoTransformTransition) {
        teardownAsideListeners();
        rafId = requestAnimationFrame(() => {
          rafId = requestAnimationFrame(focusComposer);
        });
      }
    };

    waitForAsideTransitionEnd();

    return () => {
      cancelled = true;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
      }
      teardownAsideListeners();
    };
  }, [composerInputRef, isOpen, panelRef]);
}

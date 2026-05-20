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
 * Skips when the panel was already open on mount or the user is typing elsewhere.
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

    const focusComposer = (): void => {
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

    const waitForAsideTransitionEnd = (): void => {
      const aside = panelRef.current?.closest("aside");
      if (!aside) {
        requestAnimationFrame(waitForAsideTransitionEnd);
        return;
      }

      let fallbackTimeoutId: ReturnType<typeof setTimeout> | undefined;

      const cleanup = (): void => {
        aside.removeEventListener("transitionend", handleTransitionEnd);
        if (fallbackTimeoutId != null) {
          clearTimeout(fallbackTimeoutId);
          fallbackTimeoutId = undefined;
        }
      };

      const handleTransitionEnd = (event: TransitionEvent): void => {
        if (event.target !== aside || event.propertyName !== "transform") {
          return;
        }

        cleanup();
        focusComposer();
      };

      aside.addEventListener("transitionend", handleTransitionEnd);
      fallbackTimeoutId = setTimeout(() => {
        cleanup();
        focusComposer();
      }, APP_SHELL_ASIDE_TRANSITION_FALLBACK_MS);

      const { transitionDuration, transform } = getComputedStyle(aside);
      const hasNoTransformTransition =
        transitionDuration === "0s" ||
        transitionDuration === "0ms" ||
        transform === "none";

      if (hasNoTransformTransition) {
        cleanup();
        requestAnimationFrame(() => {
          requestAnimationFrame(focusComposer);
        });
      }
    };

    waitForAsideTransitionEnd();
  }, [composerInputRef, isOpen, panelRef]);
}

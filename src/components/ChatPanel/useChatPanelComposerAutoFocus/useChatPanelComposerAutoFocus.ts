import { useLayoutEffect, useRef } from "react";
import { shouldAutoFocusPanelOnOpen } from "@/components/ChatPanel/useChatPanelComposerAutoFocus/shouldAutoFocusPanelOnOpen";
import { AnimationTheme } from "@/config/Theme";
import type { RefObject } from "react";

const APP_SHELL_ASIDE_TRANSITION_FALLBACK_MS =
  AnimationTheme.durationMs.normal + 40;

type Options = {
  isOpen: boolean;
  panelRef: RefObject<HTMLElement | null>;
  /** The textarea, or a rich text editor's editing area. */
  composerInputRef: RefObject<HTMLElement | null>;
};

/** Whether the composer takes no input: a disabled field or locked editor. */
function _isInputOff(input: HTMLElement): boolean {
  return input instanceof HTMLTextAreaElement
    ? input.disabled
    : input.getAttribute("contenteditable") === "false";
}

function _focusComposer(
  parameters: Readonly<{
    panelRef: Options["panelRef"];
    composerInputRef: Options["composerInputRef"];
    hasAutoFocusedThisOpenRef: RefObject<boolean>;
  }>,
): void {
  const { panelRef, composerInputRef, hasAutoFocusedThisOpenRef } = parameters;
  const panel = panelRef.current;
  const input = composerInputRef.current;
  if (!panel || !input || _isInputOff(input)) {
    hasAutoFocusedThisOpenRef.current = true;
    return;
  }
  const focusScope = panel.closest("aside") ?? panel;
  if (!shouldAutoFocusPanelOnOpen(focusScope)) {
    hasAutoFocusedThisOpenRef.current = true;
    return;
  }
  input.focus({ preventScroll: true });
  hasAutoFocusedThisOpenRef.current = true;
}

function _listenForAsideTransition(
  parameters: Readonly<{
    aside: HTMLElement;
    onFocus: () => void;
  }>,
): () => void {
  const { aside, onFocus } = parameters;
  let animationFrameId: number | undefined;
  const fallbackTimeoutId = setTimeout(() => {
    removeTransitionListener();
    onFocus();
  }, APP_SHELL_ASIDE_TRANSITION_FALLBACK_MS);
  const removeTransitionListener = () => {
    aside.removeEventListener("transitionend", onTransitionEnd);
    clearTimeout(fallbackTimeoutId);
  };
  const onTransitionEnd = (event: TransitionEvent): void => {
    if (event.target === aside && event.propertyName === "transform") {
      removeTransitionListener();
      onFocus();
    }
  };
  aside.addEventListener("transitionend", onTransitionEnd);

  const { transitionDuration, transform } = getComputedStyle(aside);
  if (
    transitionDuration === "0s" ||
    transitionDuration === "0ms" ||
    transform === "none"
  ) {
    removeTransitionListener();
    animationFrameId = requestAnimationFrame(() => {
      animationFrameId = requestAnimationFrame(onFocus);
    });
  }
  return () => {
    removeTransitionListener();
    if (animationFrameId !== undefined) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}

function _waitForAsideTransition(
  parameters: Readonly<{
    panelRef: Options["panelRef"];
    onFocus: () => void;
  }>,
): () => void {
  const { panelRef, onFocus } = parameters;
  let isCancelled = false;
  let animationFrameId: number | undefined;
  let stopListening: (() => void) | undefined;
  const findAside = () => {
    if (isCancelled) {
      return;
    }
    const aside = panelRef.current?.closest("aside");
    if (aside) {
      stopListening = _listenForAsideTransition({ aside, onFocus });
    } else {
      animationFrameId = requestAnimationFrame(findAside);
    }
  };
  findAside();
  return () => {
    isCancelled = true;
    if (animationFrameId !== undefined) {
      cancelAnimationFrame(animationFrameId);
    }
    stopListening?.();
  };
}

/** Focuses the chat composer after the AppShell Aside finishes opening. */
export function useChatPanelComposerAutoFocus({
  isOpen,
  panelRef,
  composerInputRef,
}: Readonly<Options>): void {
  const previousIsOpenRef = useRef(isOpen);
  const hasAutoFocusedThisOpenRef = useRef(false);

  useLayoutEffect(
    function focusComposerAfterPanelOpens() {
      const wasOpen = previousIsOpenRef.current;
      previousIsOpenRef.current = isOpen;
      if (!isOpen) {
        hasAutoFocusedThisOpenRef.current = false;
        return;
      }
      if (wasOpen || hasAutoFocusedThisOpenRef.current) {
        return;
      }
      return _waitForAsideTransition({
        panelRef,
        onFocus: () => {
          _focusComposer({
            panelRef,
            composerInputRef,
            hasAutoFocusedThisOpenRef,
          });
        },
      });
    },
    [composerInputRef, isOpen, panelRef],
  );
}

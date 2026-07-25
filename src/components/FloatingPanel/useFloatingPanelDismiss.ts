import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { isFloatingPanelTypingTarget } from "./isFloatingPanelTypingTarget";
import { shouldAutoFocusFloatingPanelOnOpen } from "./shouldAutoFocusFloatingPanelOnOpen";
import type { MouseEvent, RefObject } from "react";

type Options = {
  opened: boolean;
  isPanelMounted: boolean;
  panelRef: RefObject<HTMLDivElement | null>;
  openOriginRef?: RefObject<HTMLElement | null>;
  onDismiss: () => void;
};

function _isFocusOnOpenOrigin(
  activeElement: Element,
  openOrigin: HTMLElement | null,
): boolean {
  return (
    openOrigin != null &&
    (activeElement === openOrigin || openOrigin.contains(activeElement))
  );
}

function _isInertDocumentFocus(activeElement: Element): boolean {
  return (
    activeElement === document.body ||
    activeElement === document.documentElement
  );
}

function _shouldDismissOnEscape(
  panel: HTMLElement,
  activeElement: Element,
  openOriginRef?: RefObject<HTMLElement | null>,
): boolean {
  if (isFloatingPanelTypingTarget(activeElement)) {
    return false;
  }

  const openOrigin = openOriginRef?.current ?? null;
  if (panel.contains(activeElement)) {
    return true;
  }

  if (_isFocusOnOpenOrigin(activeElement, openOrigin)) {
    return true;
  }

  // Clicking the open trigger in jsdom (and some browsers) leaves focus on
  // `<body>`; still treat Escape as dismiss for an open panel.
  if (_isInertDocumentFocus(activeElement)) {
    return true;
  }

  return false;
}

/**
 * Auto-focuses the panel on open (unless the user is typing elsewhere) and
 * dismisses on Escape when the panel chrome or open trigger has focus.
 */
export function useFloatingPanelDismiss({
  opened,
  isPanelMounted,
  panelRef,
  openOriginRef,
  onDismiss,
}: Options): {
  handlePanelMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
} {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const hasAutoFocusedThisOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (!opened) {
      hasAutoFocusedThisOpenRef.current = false;
      return;
    }

    if (!isPanelMounted || hasAutoFocusedThisOpenRef.current) {
      return;
    }

    const focusPanelWhenReady = (): void => {
      const panel = panelRef.current;
      if (!panel) {
        requestAnimationFrame(focusPanelWhenReady);
        return;
      }

      if (!shouldAutoFocusFloatingPanelOnOpen(panel)) {
        hasAutoFocusedThisOpenRef.current = true;
        return;
      }

      panel.focus({ preventScroll: true });
      hasAutoFocusedThisOpenRef.current = true;
    };

    requestAnimationFrame(focusPanelWhenReady);
  }, [isPanelMounted, opened, panelRef]);

  useEffect(() => {
    if (!isPanelMounted) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }

      const panel = panelRef.current;
      const activeElement = document.activeElement;
      if (!panel || !activeElement) {
        return;
      }

      if (!_shouldDismissOnEscape(panel, activeElement, openOriginRef)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      onDismissRef.current();
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isPanelMounted, openOriginRef, panelRef]);

  const handlePanelMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>): void => {
      if (isFloatingPanelTypingTarget(event.target as Element)) {
        return;
      }

      panelRef.current?.focus({ preventScroll: true });
    },
    [panelRef],
  );

  return { handlePanelMouseDown };
}

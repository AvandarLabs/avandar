import { useEffect, useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

/**
 * Keyboard behavior for a map viewer popup: focus moves to its close button
 * whenever a new popup opens, without scrolling the page, and Escape pressed
 * inside the popup closes it. Escape elsewhere on the page is left alone.
 */
export function useMapViewerPopupKeyboard(
  options: Readonly<{ popupKey: unknown; onClose: () => void }>,
): {
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
} {
  const { popupKey, onClose } = options;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, [popupKey]);
  return {
    closeButtonRef,
    onKeyDown: (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    },
  };
}

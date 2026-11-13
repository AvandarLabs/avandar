import { useEffect, useRef, useState } from "react";

/** How long a popover waits after the pointer leaves before it closes. */
const CLOSE_DELAY_MS = 150;

type HoverOrFocusOpen = {
  isOpen: boolean;
  open: () => void;
  /** Closes after a short delay, so the pointer can cross to the popover. */
  closeSoon: () => void;
  close: () => void;
};

/**
 * Open state for a popover that opens on hover, on keyboard focus, and on
 * click, and closes a moment after the pointer or focus leaves. A click
 * only opens: the pointer or focus already opened it before the click
 * lands, so toggling would close it again. Use it for a popover that only
 * shows information, such as a column's code list.
 */
export function useHoverOrFocusOpen(): HoverOrFocusOpen {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const cancelClose = (): void => {
    clearTimeout(closeTimerRef.current);
  };
  useEffect(() => {
    return cancelClose;
  }, []);
  return {
    isOpen,
    open: () => {
      cancelClose();
      setIsOpen(true);
    },
    closeSoon: () => {
      cancelClose();
      closeTimerRef.current = setTimeout(() => {
        setIsOpen(false);
      }, CLOSE_DELAY_MS);
    },
    close: () => {
      cancelClose();
      setIsOpen(false);
    },
  };
}

import { useEffect, useRef, useState } from "react";

/** How long a popover waits after the pointer or focus leaves to close. */
const CLOSE_DELAY_MS = 150;

/** What is keeping the popover open. */
type OpenReason = "hover" | "focus" | "click";

type HoverOrFocusOpen = {
  isOpen: boolean;
  /** The pointer entered the tag or the popover. */
  onPointerEnter: () => void;
  /** The pointer left the tag or the popover. */
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  /** A click only opens, it never toggles. */
  onClick: () => void;
  /** Closes at once, whatever is keeping it open, as Escape does. */
  close: () => void;
};

/**
 * Open state for a popover that opens on hover, on keyboard focus, and on
 * click. Hover, focus, and a click are tracked apart, so the pointer
 * leaving does not close a popover the keyboard still has focused. It
 * closes a moment after the last of them ends, which lets the pointer
 * cross from the tag to the popover. A click only opens: the pointer or
 * focus already opened it before the click lands, so toggling would close
 * it again. Use it for a popover that only shows information, such as a
 * column's code list.
 */
export function useHoverOrFocusOpen(): HoverOrFocusOpen {
  const [isOpen, setIsOpen] = useState(false);
  const reasonsRef = useRef(new Set<OpenReason>());
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    return () => {
      clearTimeout(closeTimerRef.current);
    };
  }, []);

  const add = (reason: OpenReason): void => {
    clearTimeout(closeTimerRef.current);
    reasonsRef.current.add(reason);
    setIsOpen(true);
  };
  const remove = (...reasons: OpenReason[]): void => {
    reasons.forEach((reason) => {
      reasonsRef.current.delete(reason);
    });
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      if (reasonsRef.current.size === 0) {
        setIsOpen(false);
      }
    }, CLOSE_DELAY_MS);
  };

  return {
    isOpen,
    onPointerEnter: () => {
      add("hover");
    },
    // A click made with the pointer ends when the pointer leaves.
    onPointerLeave: () => {
      remove("hover", "click");
    },
    onFocus: () => {
      add("focus");
    },
    onBlur: () => {
      remove("focus", "click");
    },
    onClick: () => {
      add("click");
    },
    close: () => {
      clearTimeout(closeTimerRef.current);
      reasonsRef.current.clear();
      setIsOpen(false);
    },
  };
}

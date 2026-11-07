import { useEffect, useRef, useState } from "react";
import type { FocusEvent } from "react";

type Delays = {
  /** How long the pointer must rest before opening, in milliseconds. */
  openDelay: number;

  /** How long to wait after the pointer leaves before closing. */
  closeDelay: number;
};

type HoverFocusHandlers = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onFocus: () => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
};

/** An open state that changes after a delay, cancelled by the next change. */
function useDelayedIsOpen(): {
  isOpen: boolean;
  scheduleIsOpen: (nextIsOpen: boolean, delay: number) => void;
  close: () => void;
} {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, []);

  return {
    isOpen,
    scheduleIsOpen: (nextIsOpen, delay) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsOpen(nextIsOpen);
      }, delay);
    },
    close: () => {
      clearTimeout(timerRef.current);
      setIsOpen(false);
    },
  };
}

/**
 * Opens something while the pointer rests on an element or focus is inside
 * it, such as a hover card that keyboard users must also reach. Spread
 * `handlers` on the element that holds both the trigger and what it opens.
 */
export function useHoverFocusOpen({ openDelay, closeDelay }: Delays): {
  isOpen: boolean;
  close: () => void;
  handlers: HoverFocusHandlers;
} {
  const { isOpen, scheduleIsOpen, close } = useDelayedIsOpen();
  const hasFocusWithinRef = useRef(false);
  return {
    isOpen,
    close,
    handlers: {
      onMouseEnter: () => {
        scheduleIsOpen(true, isOpen ? 0 : openDelay);
      },
      onMouseLeave: () => {
        if (!hasFocusWithinRef.current) {
          scheduleIsOpen(false, closeDelay);
        }
      },
      onFocus: () => {
        hasFocusWithinRef.current = true;
        scheduleIsOpen(true, 0);
      },
      onBlur: (event) => {
        const nextFocused = event.relatedTarget;
        if (nextFocused && event.currentTarget.contains(nextFocused)) {
          return;
        }
        hasFocusWithinRef.current = false;
        scheduleIsOpen(false, closeDelay);
      },
    },
  };
}

import { useEffect, useRef, useState } from "react";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { KeyboardEvent } from "react";

/** How long the pointer rests on the reaction button to open the picker. */
const OPEN_DELAY_MS = 350;

/** How long a hover-opened picker waits for the pointer before closing. */
const CLOSE_DELAY_MS = 300;

type ReactionPickerState = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isOpenedByKeyboard: boolean;
  pick: (kind: CommentReaction.Kind) => void;
  onButtonMouseEnter: () => void;
  onButtonKeyDown: (event: KeyboardEvent) => void;
  onPointerEnterPicker: () => void;
  onPointerLeave: () => void;
};

/**
 * Open state of the reaction picker. Resting the pointer on the button
 * opens it after a delay and leaving closes it after another, unless the
 * pointer moves into the picker; the down arrow opens it at once, and then
 * the pointer leaving does not close it.
 */
export function useReactionPickerState(
  onPick: (kind: CommentReaction.Kind) => void,
): ReactionPickerState {
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenedByKeyboard, setIsOpenedByKeyboard] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      window.clearTimeout(timerRef.current);
    };
  }, []);

  const schedule = (nextIsOpen: boolean, delayMs: number) => {
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setIsOpen(nextIsOpen);
    }, delayMs);
  };

  return {
    isOpen,
    setIsOpen,
    isOpenedByKeyboard,
    pick: (kind) => {
      window.clearTimeout(timerRef.current);
      setIsOpen(false);
      onPick(kind);
    },
    onButtonMouseEnter: () => {
      setIsOpenedByKeyboard(false);
      schedule(true, OPEN_DELAY_MS);
    },
    onButtonKeyDown: (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        window.clearTimeout(timerRef.current);
        setIsOpenedByKeyboard(true);
        setIsOpen(true);
      }
    },
    onPointerEnterPicker: () => {
      window.clearTimeout(timerRef.current);
    },
    onPointerLeave: () => {
      // A picker opened from the keyboard stays until a pick or Escape.
      if (!isOpenedByKeyboard) {
        schedule(false, CLOSE_DELAY_MS);
      }
    },
  };
}

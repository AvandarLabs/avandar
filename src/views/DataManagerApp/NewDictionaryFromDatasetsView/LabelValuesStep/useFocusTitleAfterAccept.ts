import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Moves keyboard and screen reader focus to the selected list's title after
 * the user accepts a list, so the list that comes next is announced. Pass
 * the key of the selected list and the labels, which both change when a list
 * is accepted. Call `onAccepted` just before dispatching the acceptance.
 * Picking a list in the flank leaves focus where it is.
 */
export function useFocusTitleAfterAccept(
  selectedKey: string | undefined,
  labelsVersion: unknown,
): {
  titleRef: RefObject<HTMLHeadingElement | null>;
  onAccepted: () => void;
} {
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const isFocusPendingRef = useRef(false);
  useEffect(() => {
    if (isFocusPendingRef.current) {
      isFocusPendingRef.current = false;
      titleRef.current?.focus();
    }
  }, [selectedKey, labelsVersion]);
  return {
    titleRef,
    onAccepted: () => {
      isFocusPendingRef.current = true;
    },
  };
}

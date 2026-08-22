import { useCallback, useEffect, useRef } from "react";
import { DrawerHeight } from "@/components/CanvasDrawer/DrawerHeight/DrawerHeight";
import { startDrawerResizeDrag } from "@/components/CanvasDrawer/useDrawerResize/startDrawerResizeDrag";
import type { DrawerResizeDragState } from "@/components/CanvasDrawer/useDrawerResize/startDrawerResizeDrag";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

type Options = {
  heightRef: RefObject<number>;
  availableHeightRef: RefObject<number>;
  setHeight: (height: number) => void;
};

type DrawerResizeCallbacks = {
  onResizePointerDown: (event: PointerEvent<HTMLElement>) => void;
  onResizeKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

function _applyResizeKey(
  event: KeyboardEvent<HTMLElement>,
  heightRef: RefObject<number>,
  availableHeightRef: RefObject<number>,
  setHeight: (height: number) => void,
): void {
  const nextHeight = DrawerHeight.getHeightForKey({
    key: event.key,
    isShiftPressed: event.shiftKey,
    currentHeight: heightRef.current,
    availableHeight: availableHeightRef.current,
  });
  if (nextHeight !== undefined) {
    event.preventDefault();
    setHeight(nextHeight);
  }
}

/**
 * Pointer and keyboard handlers that change a canvas-docked drawer's height.
 */
export function useDrawerResizeCallbacks({
  heightRef,
  availableHeightRef,
  setHeight,
}: Readonly<Options>): DrawerResizeCallbacks {
  const dragStateRef = useRef<DrawerResizeDragState | undefined>(undefined);

  const onResizePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      startDrawerResizeDrag({
        event,
        dragStateRef,
        heightRef,
        availableHeightRef,
        setHeight,
      });
    },
    [heightRef, availableHeightRef, setHeight],
  );

  const onResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      _applyResizeKey(event, heightRef, availableHeightRef, setHeight);
    },
    [heightRef, availableHeightRef, setHeight],
  );

  useEffect(function endDragOnUnmount() {
    return () => {
      dragStateRef.current = undefined;
    };
  }, []);

  return { onResizePointerDown, onResizeKeyDown };
}

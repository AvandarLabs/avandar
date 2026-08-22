import type { KeyboardEvent, PointerEvent, RefObject } from "react";

import { useEffect, useRef, useState } from "react";

import { DrawerHeight } from "@/components/CanvasDrawer/DrawerHeight/DrawerHeight";
import { useCanvasAreaHeight } from "@/components/CanvasDrawer/useDrawerResize/useCanvasAreaHeight";
import { useDrawerResizeCallbacks } from "@/components/CanvasDrawer/useDrawerResize/useDrawerResizeCallbacks";

type Options = {
  /**
   * The canvas the drawer is docked beneath. It is the drawer's sibling, so
   * its height plus the drawer's own height is the region the two share.
   */
  canvasRef: RefObject<HTMLElement | null>;
};

type DrawerResize = {
  /** Current expanded height, in pixels. */
  height: number;

  /** Tallest height currently allowed, for the separator's ARIA range. */
  maxHeight: number;

  /** Pointer-drag handler for the resize separator. */
  onResizePointerDown: (event: PointerEvent<HTMLElement>) => void;

  /** Arrow / Home / End handler for the resize separator. */
  onResizeKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * Owns the expanded height of a canvas-docked drawer and the drag plus
 * keyboard interactions that change it. The height is not persisted: it
 * resets with the view, the same as the drawer's open state.
 */
export function useDrawerResize({
  canvasRef,
}: Readonly<Options>): DrawerResize {
  const [height, setHeight] = useState<number>(DrawerHeight.DEFAULT_HEIGHT);
  const canvasHeight = useCanvasAreaHeight(canvasRef);
  const availableHeight = canvasHeight > 0 ? canvasHeight + height : 0;

  const availableHeightRef = useRef(availableHeight);
  const heightRef = useRef(height);
  useEffect(
    function syncLatestHeights() {
      heightRef.current = height;
      availableHeightRef.current = availableHeight;
    },
    [height, availableHeight],
  );

  const { onResizePointerDown, onResizeKeyDown } = useDrawerResizeCallbacks({
    heightRef,
    availableHeightRef,
    setHeight,
  });

  return {
    height,
    maxHeight: DrawerHeight.getMaxHeight(availableHeight) ?? height,
    onResizePointerDown,
    onResizeKeyDown,
  };
}

import { useCallback, useRef, useState } from "react";
import {
  clampDrawerHeight,
  DRAWER_DEFAULT_HEIGHT,
  DRAWER_MIN_HEIGHT,
  resolveDrawerHeightForKey,
} from "@/views/DataExplorerApp/DataExplorerDrawer/drawerHeight/drawerHeight";
import type { KeyboardEvent, PointerEvent, RefObject } from "react";

type Options = {
  /**
   * The canvas the drawer sits in. Its height caps how tall the drawer may
   * grow, so the chart always keeps a usable share of the space.
   */
  canvasRef: RefObject<HTMLElement | null>;
};

type DrawerResize = {
  /** Current expanded height, in pixels. */
  height: number;

  /** Largest height currently allowed, for the separator's ARIA range. */
  maxHeight: number;

  /** Pointer-drag handler for the resize separator. */
  onResizePointerDown: (event: PointerEvent<HTMLElement>) => void;

  /** Arrow / Home / End handler for the resize separator. */
  onResizeKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/**
 * Owns the expanded height of the Data Explorer drawer and the drag plus
 * keyboard interactions that change it. The height is deliberately not
 * persisted: it resets with the view, the same as the drawer's collapsed
 * state and active tab.
 */
export function useDrawerResize({ canvasRef }: Options): DrawerResize {
  const [height, setHeight] = useState(DRAWER_DEFAULT_HEIGHT);

  const readCanvasHeight = useCallback((): number => {
    return canvasRef.current?.getBoundingClientRect().height ?? 0;
  }, [canvasRef]);

  const dragStateRef = useRef<
    { startClientY: number; startHeight: number } | undefined
  >(undefined);

  const onResizePointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      const handle = event.currentTarget;
      dragStateRef.current = {
        startClientY: event.clientY,
        startHeight: height,
      };
      handle.setPointerCapture(event.pointerId);

      const onPointerMove = (moveEvent: globalThis.PointerEvent): void => {
        const dragState = dragStateRef.current;
        if (!dragState) {
          return;
        }
        // The drawer is anchored to the bottom, so dragging up (a smaller
        // clientY) makes it taller.
        const requestedHeight =
          dragState.startHeight - (moveEvent.clientY - dragState.startClientY);
        setHeight(
          clampDrawerHeight({
            requestedHeight,
            canvasHeight: readCanvasHeight(),
          }),
        );
      };

      const onPointerUp = (): void => {
        dragStateRef.current = undefined;
        handle.removeEventListener("pointermove", onPointerMove);
        handle.removeEventListener("pointerup", onPointerUp);
        handle.removeEventListener("pointercancel", onPointerUp);
      };

      handle.addEventListener("pointermove", onPointerMove);
      handle.addEventListener("pointerup", onPointerUp);
      handle.addEventListener("pointercancel", onPointerUp);
      event.preventDefault();
    },
    [height, readCanvasHeight],
  );

  const onResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      const nextHeight = resolveDrawerHeightForKey({
        key: event.key,
        isShiftPressed: event.shiftKey,
        currentHeight: height,
        canvasHeight: readCanvasHeight(),
      });
      if (nextHeight === undefined) {
        return;
      }
      event.preventDefault();
      setHeight(nextHeight);
    },
    [height, readCanvasHeight],
  );

  const canvasHeight = readCanvasHeight();
  const maxHeight =
    canvasHeight > 0 ?
      clampDrawerHeight({
        requestedHeight: Number.MAX_SAFE_INTEGER,
        canvasHeight,
      })
    : DRAWER_MIN_HEIGHT;

  return { height, maxHeight, onResizePointerDown, onResizeKeyDown };
}

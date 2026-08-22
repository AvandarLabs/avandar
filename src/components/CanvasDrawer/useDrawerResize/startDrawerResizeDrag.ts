import type { PointerEvent, RefObject } from "react";

import { DrawerHeight } from "@/components/CanvasDrawer/DrawerHeight/DrawerHeight";

/** Pointer-drag snapshot used while resizing a canvas-docked drawer. */
export type DrawerResizeDragState = {
  pointerId: number;
  startClientY: number;
  startHeight: number;
  availableHeight: number;
};

type Options = {
  event: PointerEvent<HTMLElement>;
  dragStateRef: RefObject<DrawerResizeDragState | undefined>;
  heightRef: RefObject<number>;
  availableHeightRef: RefObject<number>;
  setHeight: (height: number) => void;
};

function _applyDragMove(
  moveEvent: globalThis.PointerEvent,
  dragState: DrawerResizeDragState,
  setHeight: (height: number) => void,
): void {
  if (moveEvent.pointerId !== dragState.pointerId) {
    return;
  }
  const requestedHeight =
    dragState.startHeight - (moveEvent.clientY - dragState.startClientY);
  setHeight(
    DrawerHeight.clamp({
      requestedHeight,
      availableHeight: dragState.availableHeight,
    }),
  );
}

/** Starts a pointer drag that changes the canvas drawer's expanded height. */
export function startDrawerResizeDrag({
  event,
  dragStateRef,
  heightRef,
  availableHeightRef,
  setHeight,
}: Readonly<Options>): void {
  if (dragStateRef.current) {
    return;
  }

  const dragState: DrawerResizeDragState = {
    pointerId: event.pointerId,
    startClientY: event.clientY,
    startHeight: heightRef.current,
    availableHeight: availableHeightRef.current,
  };
  dragStateRef.current = dragState;

  const onPointerMove = (moveEvent: globalThis.PointerEvent): void => {
    const currentDragState = dragStateRef.current;
    if (currentDragState) {
      _applyDragMove(moveEvent, currentDragState, setHeight);
    }
  };

  const onDragEnd = (): void => {
    dragStateRef.current = undefined;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onDragEnd);
    window.removeEventListener("pointercancel", onDragEnd);
    window.removeEventListener("lostpointercapture", onDragEnd);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onDragEnd);
  window.addEventListener("pointercancel", onDragEnd);
  window.addEventListener("lostpointercapture", onDragEnd);
  event.preventDefault();
}

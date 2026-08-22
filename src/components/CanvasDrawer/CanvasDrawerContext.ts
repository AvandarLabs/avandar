import { createContext, useContext } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

/** Shared resize and open state for canvas-drawer compound children. */
export type CanvasDrawerContextValue = {
  opened: boolean;
  height: number;
  maxHeight: number;
  onResizePointerDown: (event: PointerEvent<HTMLElement>) => void;
  onResizeKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
};

/** Context backing `CanvasDrawer.Body` and `CanvasDrawer.ResizeHandle`. */
export const CanvasDrawerContext = createContext<
  CanvasDrawerContextValue | undefined
>(undefined);

/** Reads the surrounding canvas drawer. Throws outside `CanvasDrawer`. */
export function useCanvasDrawerContext(): CanvasDrawerContextValue {
  const value = useContext(CanvasDrawerContext);
  if (value === undefined) {
    throw new Error(
      "CanvasDrawer.Body and CanvasDrawer.ResizeHandle must be rendered inside CanvasDrawer",
    );
  }
  return value;
}

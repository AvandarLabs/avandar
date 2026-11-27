import { DEMO_CANVAS } from "./DemoCanvas/DemoCanvas";
import type { MotionRect } from "../../../../motion-components/getOverlayTimings";

type GetCanvasRectOptions = {
  x: number;
  y: number;
  width: number;
  height?: number;
};
/** A rect on the mini canvas from fractions of it, as windowTilt boxes are. */
export function getCanvasRect(fractions: GetCanvasRectOptions): MotionRect {
  return {
    x: fractions.x * DEMO_CANVAS.width,
    y: fractions.y * DEMO_CANVAS.height,
    width: fractions.width * DEMO_CANVAS.width,
    height: (fractions.height ?? 0) * DEMO_CANVAS.height,
  };
}

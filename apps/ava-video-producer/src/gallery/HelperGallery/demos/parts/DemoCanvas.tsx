import css from "./parts.module.css";
import type { ReactNode } from "react";

/**
 * The mini film frame window previews draw into, at the 1.6 aspect ratio of
 * the film canvas. Its dashed edge is the frame edge, so a whip visibly
 * leaves the picture.
 */
export const DEMO_CANVAS = { width: 640, height: 400 } as const;

/** A rect on the mini canvas from fractions of it, as windowTilt boxes are. */
export function getCanvasRect(fractions: {
  x: number;
  y: number;
  width: number;
  height?: number;
}) {
  return {
    x: fractions.x * DEMO_CANVAS.width,
    y: fractions.y * DEMO_CANVAS.height,
    width: fractions.width * DEMO_CANVAS.width,
    height: (fractions.height ?? 0) * DEMO_CANVAS.height,
  };
}

/** The mini film frame, centred on the preview stage. */
export function DemoCanvas({ children }: { children: ReactNode }) {
  return <div className={css.canvas}>{children}</div>;
}

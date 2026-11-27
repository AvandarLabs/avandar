import css from "./OverlaySourceOutline.module.css";
import type { MotionRect } from "../../../../motion-components/getOverlayTimings";
import type { ReactNode } from "react";

const CELL: MotionRect = { x: 60, y: 260, width: 160, height: 44 };
/** Marks the fixed source cell in the anchored-overlay helper preview. */
export function OverlaySourceOutline(): ReactNode {
  return (
    <div
      className={css.overlaySourceOutlineBox}
      style={{
        left: CELL.x,
        top: CELL.y,
        width: CELL.width,
        height: CELL.height,
      }}
    />
  );
}

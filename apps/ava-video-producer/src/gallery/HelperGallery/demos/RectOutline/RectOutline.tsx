import css from "./RectOutline.module.css";
import type { MotionRect } from "../../../../motion-components/getOverlayTimings";
import type { ReactNode } from "react";

/** Renders RectOutline for live helper catalog previews. */
export function RectOutline({ rect, label }: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.rectOutlineBox}
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
      }}
    >
      <span className={css.rectOutlineBoxLabel}>{label}</span>
    </div>
  );
}

type Props = { rect: MotionRect; label: string };

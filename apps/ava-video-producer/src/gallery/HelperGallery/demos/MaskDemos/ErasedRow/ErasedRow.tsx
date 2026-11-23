import { getEraseMaskStyle } from "../../../../../motion-components/getEraseMaskStyle";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { MaskDemosGalleryValues } from "../MaskDemosGalleryValues/MaskDemosGalleryValues";
import css from "./ErasedRow.module.css";
import type { ReactNode } from "react";

type Props = { frame: number; index: number; eraseAt: number };

/** When the rows start arriving. A cue, not a length. */
const ROWS_AT = 6;

/** One list row erased behind the soft-edged mask, on the travel curve. */
export function ErasedRow(props: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const progress = motion.ramp(
    props.frame,
    props.eraseAt,
    motion.scale(MaskDemosGalleryValues.ERASE_FRAMES),
    motion.travel.easing,
  );
  return (
    <div
      className={css.erasedRowListRow}
      style={{
        ...motion.enterAt(props.frame, ROWS_AT, props.index),
        ...getEraseMaskStyle({
          progress,
        }),
      }}
    >
      <span className={css.erasedRowListDot} />
      <span
        className={css.erasedRowListBar}
        style={{ width: 140 + props.index * 40 }}
      />
    </div>
  );
}

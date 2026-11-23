import { getEraseMaskStyle } from "../../../motion-components/getEraseMaskStyle";
import css from "./BarErasable.module.css";
import type { ErasableOptions as Props } from "../BarComparisonScene.types";
import type { ReactNode } from "react";

/**
 * Wraps one element so the scene's exit can erase it on its own, sweeping on
 * the travel curve.
 */
export function BarErasable({
  frame,
  startFrame,
  durationInFrames,
  motion,
  children,
}: Readonly<Props>): ReactNode {
  if (startFrame === undefined) {
    return <>{children}</>;
  }
  const progress = motion.ramp(
    frame,
    startFrame,
    durationInFrames,
    motion.travel.easing,
  );
  return (
    <div
      className={css.barErasablediv1}
      style={{
        ...getEraseMaskStyle({ progress }),
      }}
    >
      {children}
    </div>
  );
}

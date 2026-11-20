import css from "../demos.module.css";
import { BlurDemosShared } from "./BlurDemosShared/BlurDemosShared";
import type { ReactNode } from "react";
/** Velocity blur for the same move under three motion presets. */
/** One rail per preset, each block blurred by that preset. */
export function VelocityBlurRails({
  x,
  getBlur,
}: {
  x: number;
  getBlur: (preset: (typeof BlurDemosShared.PRESETS)[number]) => number;
}): ReactNode {
  return (
    <div className={css.timeline}>
      {BlurDemosShared.PRESETS.map((preset) => {
        return (
          <div key={preset} className={css.timelineRow}>
            <span className={css.timelineName}>{preset}</span>
            <div className={css.rail}>
              <span
                className={css.railBlock}
                style={{
                  left: x * 0.85,
                  filter: `blur(${getBlur(preset).toFixed(2)}px)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

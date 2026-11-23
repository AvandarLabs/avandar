import { BlurDemosShared } from "../BlurDemosShared/BlurDemosShared";
import css from "./VelocityBlurRails.module.css";
import type { ReactNode } from "react";

type Props = {
  x: number;
  getBlur: (preset: (typeof BlurDemosShared.PRESETS)[number]) => number;
};

/** Velocity blur for the same move under three motion presets. */
/** One rail per preset, each block blurred by that preset. */
export function VelocityBlurRails({ x, getBlur }: Readonly<Props>): ReactNode {
  return (
    <div className={css.velocityBlurRailsTimeline}>
      {BlurDemosShared.PRESETS.map((preset) => {
        return (
          <div key={preset} className={css.velocityBlurRailsTimelineRow}>
            <span className={css.velocityBlurRailsTimelineName}>{preset}</span>
            <div className={css.velocityBlurRailsRail}>
              <span
                className={css.velocityBlurRailsRailBlock}
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

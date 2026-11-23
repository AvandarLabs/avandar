import { clsx } from "clsx";
import { CurvePlot } from "../CurvePlot/CurvePlot";
import css from "./EasingStage.module.css";
import type { ReactNode } from "react";

/** Width of the rails the eased and linear blocks travel along. */
const RAIL_TRAVEL = 400;

type Props = {
  easing: (t: number) => number;
  t: number;
  handles?: readonly [number, number, number, number];
};

/** A plotted curve beside a block moving on it and a linear reference. */
export function EasingStage({
  easing,
  t,
  handles,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.easingStageSplit}>
      <div className={css.easingStagePlotCell}>
        <CurvePlot easing={easing} t={t} size={330} handles={handles} />
      </div>
      <div className={css.easingStageRails}>
        <div className={css.easingStageRail}>
          <span className={css.easingStageRailLabel}>eased</span>
          <span
            className={css.easingStageRailBlock}
            style={{ left: easing(t) * RAIL_TRAVEL }}
          />
        </div>
        <div className={css.easingStageRail}>
          <span className={css.easingStageRailLabel}>linear time</span>
          <span
            className={clsx(css.easingStageRailBlock, css.easingStageRailGhost)}
            style={{ left: t * RAIL_TRAVEL }}
          />
        </div>
      </div>
    </div>
  );
}

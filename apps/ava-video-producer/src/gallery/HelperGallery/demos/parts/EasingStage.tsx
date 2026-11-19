import clsx from "clsx";
import css from "../demos.module.css";
import { CurvePlot } from "./CurvePlot";
import type { ReactNode } from "react";

/** Width of the rails the eased and linear blocks travel along. */
const RAIL_TRAVEL = 400;

type StageProps = {
  easing: (t: number) => number;
  t: number;
  handles?: readonly [number, number, number, number];
};

/** A plotted curve beside a block moving on it and a linear reference. */
export function EasingStage({ easing, t, handles }: StageProps): ReactNode {
  return (
    <div className={css.split}>
      <div className={css.plotCell}>
        <CurvePlot easing={easing} t={t} size={330} handles={handles} />
      </div>
      <div className={css.rails}>
        <div className={css.rail}>
          <span className={css.railLabel}>eased</span>
          <span
            className={css.railBlock}
            style={{ left: easing(t) * RAIL_TRAVEL }}
          />
        </div>
        <div className={css.rail}>
          <span className={css.railLabel}>linear time</span>
          <span
            className={clsx(css.railBlock, css.railGhost)}
            style={{ left: t * RAIL_TRAVEL }}
          />
        </div>
      </div>
    </div>
  );
}

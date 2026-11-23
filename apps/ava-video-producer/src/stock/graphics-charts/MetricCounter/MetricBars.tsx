import { Arrive } from "../../graphics-common/Arrive/Arrive";
import {
  BARS_AT,
  BAR_GROW_AT,
  BAR_ALPHA_STEPS,
} from "./MetricCounter.constants";
import type { MetricBarsData } from "./MetricCounter.types";
import type { ReactNode } from "react";

type Props = MetricBarsData;

/** Renders the metric bars layer for MetricCounter. */
export function MetricBars(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.input.showBars
        ? options.bars.map((height, i) => {
            const grow = options.motion.ramp(
              options.frame,
              BAR_GROW_AT + i * options.motion.stagger.list,
              options.motion.hero,
            );
            return (
              // prettier-ignore
              // Bars retain fixed horizontal slots
              // throughout the frame-driven grow
              // animation. Equal authored heights remain
              // distinct bars.
              // react-doctor-disable-next-line no-array-index-as-key
              <Arrive frame={options.frame} at={BARS_AT} index={i} key={i}>
                  <rect x={172 + i * 50} y={437 - height * 54 * grow} width={34} height={Math.max(1, height * 54 * grow)} rx={options.shapes.corner(options.corner.chip)} fill={options.accent} fillOpacity={options.atomic.opacity["18"] + i / BAR_ALPHA_STEPS}/>
                </Arrive>
            );
          })
        : null}
    </>
  );
}

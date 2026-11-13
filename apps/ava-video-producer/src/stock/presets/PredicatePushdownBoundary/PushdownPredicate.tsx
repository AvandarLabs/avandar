import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme";
import type { Input } from "./PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };

const TRAVEL_CUE = 13;
const TRAVEL_FRAMES = 37;
const CONDITION_CUE = 50;
const CONDITION_FADE_FRAMES = 12;

/** The typed numeric condition arrives at the source before gates close. */
export function PushdownPredicate({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const { color } = useGraphicTokens();
  const motion = useGraphicMotion();
  const predicateX = mix(
    ramp(frame, TRAVEL_CUE, motion.scale(TRAVEL_FRAMES), motion.travel.easing),
    300,
    64,
  );
  return (
    <g data-predicate="true" data-unit={input.metric.unit} data-x={predicateX}>
      <StockRect
        x={predicateX - 8}
        y={92}
        width={364}
        height={82}
        rx={style.predicateRadius}
        fill={color.elevated}
        stroke={accent}
        strokeWidth={style.predicateStrokeWidth}
      />
      <LabelSlots
        labels={[
          [input.metric.label, predicateX, 109, 346, 12, 2],
          [
            `${input.predicate.operator} ${input.predicate.threshold}`,
            predicateX,
            139,
            160,
            12,
            3,
          ],
          [input.metric.unit, predicateX + 174, 139, 172, 12, 3],
        ]}
      />
      {frame >= CONDITION_CUE ? (
        <g
          opacity={ramp(
            frame,
            CONDITION_CUE,
            motion.scale(CONDITION_FADE_FRAMES),
          )}
        >
          <LabelSlots
            labels={[[input.labels.condition, 516, 109, 396, 12, 2]]}
          />
        </g>
      ) : undefined}
    </g>
  );
}

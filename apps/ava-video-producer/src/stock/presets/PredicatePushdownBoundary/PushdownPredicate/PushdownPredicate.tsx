import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PredicateBadge } from "./PredicateBadge";
import { PredicateCondition } from "./PredicateCondition";
import type { Input } from "../PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
};
const TRAVEL_CUE = 13;
const TRAVEL_FRAMES = 37;
const CONDITION_CUE = 50;
/** The typed numeric condition arrives at the source before gates close. */
export function PushdownPredicate({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const predicateX = Motion.mix({
    t: Motion.ramp({
      frame,
      at: TRAVEL_CUE,
      dur: motion.scale(TRAVEL_FRAMES),
      easing: motion.travel.easing,
    }),
    from: 300,
    to: 64,
  });
  return (
    <g data-predicate="true" data-unit={input.metric.unit} data-x={predicateX}>
      <PredicateBadge x={predicateX} input={input} accent={accent} />
      {frame >= CONDITION_CUE ? (
        <PredicateCondition
          frame={frame}
          cue={CONDITION_CUE}
          label={input.labels.condition}
        />
      ) : undefined}
    </g>
  );
}

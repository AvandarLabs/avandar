import { mix } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { PracticeStrip } from "./PracticeStrip";
import type { getRehearsalFromFrame } from "./getRehearsalFromFrame";
import type { Input } from "./SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  scene: ReturnType<typeof getRehearsalFromFrame>;
  accent: string;
};
/**
 * The learner handles the locker and holds an optional authored practice strip.
 */
export function PracticePeople({
  input,
  scene,
  accent,
}: Readonly<Props>): ReactNode {
  const { learnerX, companionX, doorWidth, touch, finalStep } = scene;
  return (
    <g>
      <PersonGlyph x={companionX} y={390} color={STOCK.cyan} />
      <circle
        data-companion=""
        cx={companionX}
        cy={376}
        r={7}
        fill={STOCK.cyan}
      />
      <path
        data-support-gesture={input.finalStepSupport}
        d={`M${companionX} 390 L${companionX + mix(finalStep, 20, input.finalStepSupport === "alongside" ? 40 : 12)} ${mix(finalStep, 398, input.finalStepSupport === "alongside" ? 385 : 405)}`}
        stroke={STOCK.cyan}
        strokeWidth={3}
        fill="none"
      />
      <PersonGlyph x={learnerX} y={390} color={accent} />
      <circle data-learner="" cx={learnerX} cy={376} r={7} fill={accent} />
      <line
        data-locker-hand=""
        x1={learnerX}
        y1={390}
        x2={mix(touch, learnerX + 12, 345 + doorWidth - 8)}
        y2={mix(touch, 402, 305)}
        stroke={accent}
        strokeWidth={3}
      />
      <PracticeStrip input={input} learnerX={learnerX} accent={accent} />
    </g>
  );
}

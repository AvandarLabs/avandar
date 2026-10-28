import { ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { getPlannerHandsFromInputAndFrame } from "./getPlannerHandsFromInputAndFrame";
import { PlannerHands } from "./PlannerHands";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Two actors perform the proposal, participant-led move and agreement. */
export function PlannerPeople({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { agreement } = getPlannerHandsFromInputAndFrame({ input, frame });
  return (
    <g>
      <PersonGlyph
        x={105}
        y={130}
        size={72}
        posture="seated"
        role="participant"
        color={accent}
      />
      <PersonGlyph
        x={865}
        y={130}
        size={72}
        posture="seated"
        role="worker"
        color={STOCK.cyan}
      />
      <PlannerHands input={input} frame={frame} accent={accent} />
      <path
        data-agreement-mark=""
        d={`M${agreement.x - 4} ${agreement.y}l4 4 8-10`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - ramp(frame, 120, 12)}
        opacity={ramp(frame, 120, 1)}
      />
    </g>
  );
}

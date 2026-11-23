import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPlannerHandsFromInputAndFrame } from "../getPlannerHandsFromInputAndFrame";
import { PlannerHands } from "../PlannerHands/PlannerHands";
import { AgreementMark } from "./AgreementMark";
import type { Input } from "../PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Two actors perform the proposal, participant-led move and agreement. */
export function PlannerPeople({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { agreement } = getPlannerHandsFromInputAndFrame({
    input,
    frame,
    motion,
  });
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
        color={tokens.color.accentAlt}
      />
      <PlannerHands input={input} frame={frame} accent={accent} />
      <AgreementMark agreement={agreement} frame={frame} accent={accent} />
    </g>
  );
}

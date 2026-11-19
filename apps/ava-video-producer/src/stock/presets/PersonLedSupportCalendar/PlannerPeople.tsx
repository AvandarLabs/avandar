import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
      <g data-agreement-mark="">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${agreement.x - 4} ${agreement.y}l4 4 8-10`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - motion.reveal(frame, 120)}
          opacity={motion.ramp(
            frame,
            120,
            motion.scale(1),
            motion.reveal.easing,
          )}
        />
      </g>
    </g>
  );
}

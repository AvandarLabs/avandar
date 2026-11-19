import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
  useGraphicMotion,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getPlannerHandsFromInputAndFrame } from "./getPlannerHandsFromInputAndFrame";
import type { Input } from "./PersonLedSupportCalendar.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Articulated hands maintain actual contact with the moving appointment. */
export function PlannerHands({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const { participant, worker } = getPlannerHandsFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      <g data-participant-arm="">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M120 136 L160 191 L ${participant.x} ${participant.y}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
      <g data-worker-arm="">
        <SketchedShape
          shape={{
            kind: "path",
            d: `M850 136 L815 191 L ${worker.x} ${worker.y}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.accentAlt}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      </g>
      <circle
        data-participant-hand=""
        cx={participant.x}
        cy={participant.y}
        r={6}
        fill={accent}
      />
      <circle
        data-worker-hand=""
        cx={worker.x}
        cy={worker.y}
        r={6}
        fill={tokens.color.accentAlt}
      />
    </g>
  );
}

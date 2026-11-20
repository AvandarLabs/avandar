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
  const { participant, worker } = getPlannerHandsFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      <g data-participant-arm="">
        <PlannerArm
          path={`M120 136 L160 191 L ${participant.x} ${participant.y}`}
          color={accent}
        />
      </g>
      <g data-worker-arm="">
        <PlannerArm
          path={`M850 136 L815 191 L ${worker.x} ${worker.y}`}
          color={tokens.color.accentAlt}
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

/** An articulated arm from shoulder through elbow to its hand. */
function PlannerArm({
  path,
  color,
}: Readonly<{ path: string; color: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d: path }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={color}
      strokeWidth={scales.stroke(tokens.stroke.heavy)}
    />
  );
}

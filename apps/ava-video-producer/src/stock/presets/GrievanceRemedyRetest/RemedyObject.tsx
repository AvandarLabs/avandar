import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { LampObject } from "./LampObject";
import { LockerObject } from "./LockerObject";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** A latch closes or a lamp lights only for the supplied functioning retest. */
export function RemedyObject({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const functioning =
    input.testResults.after === "functioning"
      ? motion.ramp(frame, 98, motion.scale(10))
      : 0;
  const attempt =
    8 * Math.sin(Math.PI * motion.ramp(frame, 20, motion.scale(10))) +
    (input.testResults.after !== "not-tested"
      ? 8 * Math.sin(Math.PI * motion.ramp(frame, 98, motion.scale(10)))
      : 0);
  const replacement = motion.ramp(frame, 56, motion.scale(22));
  const isLamp = input.object.kind === "desk-lamp";
  const objectState =
    frame >= 108 ? input.testResults.after : "not-functioning";
  return (
    <g data-object-state={objectState}>
      {isLamp ? (
        <LampObject functioning={functioning} accent={accent} />
      ) : (
        <LockerObject functioning={functioning} accent={accent} />
      )}
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${mix(replacement, 560, 615)} ${mix(replacement, 322, 410)} l-10 16`,
        }}
        profile={tokens.sketch.shape}
        data-old-part="retained"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(6)}
      />
      <rect
        data-replacement-part="worker"
        x={mix(replacement, 730, 550)}
        y={mix(replacement, 365, 321)}
        width={24}
        height={18}
        rx={scales.corner(3)}
        fill={tokens.color.accentAlt}
        opacity={motion.ramp(frame, 44, motion.whip)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M560 330 l${isLamp ? 12 : 14} ${mix(functioning, 12, 0) - attempt}`,
        }}
        profile={tokens.sketch.shape}
        data-object-operation="handle"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    </g>
  );
}

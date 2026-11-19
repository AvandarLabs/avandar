import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Staff handles the selected barrier and holds its door without pushing. */
export function ServiceStaff({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const index = input.services.findIndex(propEq("id", input.chosenServiceId));
  const x = 160 + ((index + 0.5) * 640) / input.services.length;
  const progress = motion.ramp(
    frame,
    44,
    motion.scale(32),
    motion.travel.easing,
  );
  const barrierX =
    input.accessChange === "clear-entrance"
      ? x -
        30 +
        motion.ramp(frame, 44, motion.scale(32), motion.travel.easing) * 94
      : x - 42 - 58 * progress;
  const handX = frame >= 44 && frame < 77 ? barrierX : x + 42;
  const handY =
    frame >= 44 && frame < 77
      ? input.accessChange === "unfold-ramp"
        ? mix(progress, 246, 356)
        : 337
      : 270;
  return (
    <g>
      <PersonGlyph x={x + 88} y={272} size={40} role="worker" color={accent} />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 88} 272 L${x + 64} ${handY - 10} L${handX} ${handY}`,
        }}
        profile={tokens.sketch.shape}
        data-staff-arm
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle data-staff-hand cx={handX} cy={handY} r={3} fill={accent} />
    </g>
  );
}

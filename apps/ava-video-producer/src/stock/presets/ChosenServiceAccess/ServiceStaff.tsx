import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Staff handles the selected barrier and holds its door without pushing. */
export function ServiceStaff({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const index = input.services.findIndex(propEq("id", input.chosenServiceId));
  const x = 160 + ((index + 0.5) * 640) / input.services.length;
  const progress = ramp(frame, 44, 32, EASE.inOut);
  const barrierX =
    input.accessChange === "clear-entrance"
      ? x - 30 + ramp(frame, 44, 32, EASE.inOut) * 94
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
      <path
        data-staff-arm
        d={`M${x + 88} 272 L${x + 64} ${handY - 10} L${handX} ${handY}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <circle data-staff-hand cx={handX} cy={handY} r={3} fill={accent} />
    </g>
  );
}

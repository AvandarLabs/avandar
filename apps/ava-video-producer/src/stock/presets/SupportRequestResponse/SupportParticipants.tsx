import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SupportRequestResponse.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * Only accepting the request moves a chair and colleague to the shared task.
 */
export function SupportParticipants({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const join =
    input.response.state === "joins" ? ramp(frame, 97, 20, EASE.inOut) : 0;
  const colleagueX = mix(join, 780, 670);
  const chairX = mix(join, 780, 650);
  const grab =
    input.response.state === "joins" ? ramp(frame, 89, 8, EASE.inOut) : 0;
  const reach =
    input.response.state === "joins" ? ramp(frame, 117, 13, EASE.inOut) : 0;
  const handX = mix(reach, mix(grab, 760, chairX + 55), 570);
  const handY = mix(reach, mix(grab, 345, 375), 365);
  return (
    <g opacity={ramp(frame, 12, 12)}>
      <PersonGlyph x={240} y={330} size={76} posture="seated" color={accent} />
      <path d="M240 330 L330 365" fill="none" stroke={accent} strokeWidth={4} />
      <PersonGlyph x={colleagueX} y={330} size={76} color={STOCK.cyan} />
      <circle
        cx={colleagueX - mix(ramp(frame, 43, 20), 0, 10)}
        cy={307}
        r={2.5}
        fill={STOCK.cyan}
      />
      <path
        d={`M${colleagueX} 330 L${handX} ${handY}`}
        fill="none"
        stroke={STOCK.cyan}
        strokeWidth={4}
      />
      <circle
        data-chair-hand={
          input.response.state === "joins" && frame >= 97 && frame <= 117
            ? "true"
            : undefined
        }
        data-shared-hand={
          input.response.state === "joins" && frame >= 117 ? "true" : undefined
        }
        cx={handX}
        cy={handY}
        r={5}
        fill={STOCK.cyan}
      />
      {input.response.state === "joins" && frame > 89 ? (
        <rect
          data-second-chair="true"
          x={chairX}
          y={375}
          width={55}
          height={35}
          rx={4}
          stroke={STOCK.cyan}
          fill="none"
          strokeWidth={3}
          opacity={ramp(frame, 89, 8)}
        />
      ) : undefined}
      <g data-colleague-name="true">
        <LabelSlots labels={[[input.people.colleague, 700, 200, 200, 20, 4]]} />
      </g>
    </g>
  );
}

import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PeerContributionRecognition.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string; focusedX: number };
/** A pointing arm contacts the focused object before turning to its maker. */
export function RecognitionExchange({
  input,
  frame,
  accent,
  focusedX,
}: Readonly<Props>): ReactNode {
  const point = ramp(frame, 45, 24, EASE.inOut);
  const turn = ramp(frame, 89, 24, EASE.inOut);
  const handX = mix(turn, mix(point, 788, focusedX + 80), 195);
  const handY = mix(turn, mix(point, 315, 330), 300);
  return (
    <g>
      <g opacity={ramp(frame, 12, 12)}>
        <PersonGlyph x={150} y={300} size={76} color={accent} />
        <PersonGlyph x={810} y={300} size={76} color={STOCK.cyan} />
      </g>
      <path
        d={`M810 300 L${handX} ${handY}`}
        stroke={STOCK.cyan}
        strokeWidth={4}
        fill="none"
      />
      <circle
        data-pointing-hand="true"
        cx={handX}
        cy={handY}
        r={5}
        fill={STOCK.cyan}
      />
      <circle cx={mix(turn, 803, 799)} cy={277} r={2.5} fill={STOCK.cyan} />
      <line
        data-acknowledgment-anchor="true"
        x1={focusedX + 80}
        y1={330}
        x2={165}
        y2={340}
        opacity={ramp(frame, 67, 20) * 0.6}
        stroke={accent}
        strokeDasharray="4 6"
      />
      <g opacity={ramp(frame, 89, 20)}>
        <rect
          data-acknowledgment-box="true"
          x={310}
          y={30}
          width={590}
          height={90}
          rx={input.acknowledgment.form === "spoken" ? 20 : 2}
          stroke={STOCK.cyan}
          fill={STOCK.surface}
        />
        {input.acknowledgment.form === "spoken" ? (
          <path
            d="M800 120 l10 18 l10 -18"
            fill={STOCK.surface}
            stroke={STOCK.cyan}
          />
        ) : (
          <path d="M870 30 v20 h30" stroke={STOCK.cyan} fill="none" />
        )}
        <LabelSlots
          labels={[[input.acknowledgment.text, 330, 55, 550, 18, 3]]}
        />
      </g>
    </g>
  );
}

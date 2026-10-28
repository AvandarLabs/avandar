import { EASE, mix, ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { frame: number };
/** The operator reaches the capture valve before transfer begins. */
export function CarbonOperator({ frame }: Readonly<Props>): ReactNode {
  const cue = ramp(frame, 44, 10, EASE.inOut);
  return (
    <g>
      {" "}
      <PersonGlyph
        x={150}
        y={325}
        size={42}
        role="worker"
        color={STOCK.orange}
      />
      <path
        data-operator-arm
        d={`M150 325 L210 ${mix(cue, 330, 339)} L${mix(cue, 174, 280)} ${mix(cue, 337, 354)}`}
        fill="none"
        stroke={STOCK.orange}
        strokeWidth={3}
      />
      <circle
        data-operator-hand
        cx={mix(cue, 174, 280)}
        cy={mix(cue, 337, 354)}
        r={3}
        fill={STOCK.orange}
      />
      <circle
        data-transfer-valve
        cx={280}
        cy={354}
        r={7}
        fill={STOCK.surface}
        stroke={STOCK.orange}
      />
    </g>
  );
}

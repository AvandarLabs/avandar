import { mix, ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { frame: number; accent: string };
/** The operator's hand stays on the outlet handle while setting it. */
export function OutletOperator({ frame, accent }: Readonly<Props>): ReactNode {
  const handleY = mix(ramp(frame, 36, 12), 210, 185);
  return (
    <g>
      <PersonGlyph x={270} y={185} size={42} role="worker" color={accent} />
      <path
        d={`M278 186L302 190L330 ${handleY}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <path
        data-gate="physical"
        d={`M330 230V${handleY}`}
        stroke={STOCK.muted}
        strokeWidth={4}
      />
      <circle data-hand="contact" cx={330} cy={handleY} r={4} fill={accent} />
      <circle
        data-handle="contact"
        cx={330}
        cy={handleY}
        r={7}
        fill="none"
        stroke={STOCK.orange}
      />
    </g>
  );
}

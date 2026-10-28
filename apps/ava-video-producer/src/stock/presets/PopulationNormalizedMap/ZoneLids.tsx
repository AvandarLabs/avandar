import { EASE, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ZoneLid } from "./ZoneLid";
import type { Input } from "./PopulationNormalizedMap.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/**
 * Count shades lift and settle as population-normalized shades on stable zones.
 */
export function ZoneLids({ input, frame, accent }: Readonly<Props>): ReactNode {
  const lift =
    32 *
    ramp(frame, 36, 36, EASE.inOut) *
    (1 - ramp(frame, 72, 36, EASE.inOut));
  return (
    <g>
      <rect
        x={40}
        y={155}
        width={530}
        height={305}
        rx={8}
        fill={STOCK.surface}
      />
      {input.zones.map((zone, index) => (
        <ZoneLid
          key={zone.id}
          zone={zone}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
          lift={lift}
        />
      ))}
    </g>
  );
}

import { getZoneShadeFromInputAndFrame } from "./getZoneShadeFromInputAndFrame";
import { ZoneGround } from "./ZoneGround";
import { ZoneSurface } from "./ZoneSurface";
import type { Input } from "./PopulationNormalizedMap.schema";
import type { ReactNode } from "react";

type Props = {
  zone: Input["zones"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
  lift: number;
};
/**
 * One lifted boundary remains connected to its zone's unchanged denominator.
 */
export function ZoneLid({
  zone,
  index,
  input,
  frame,
  accent,
  lift,
}: Readonly<Props>): ReactNode {
  const points = zone.polygon
    .map(([x, y]) => `${55 + x * 5},${180 + y * 2.5}`)
    .join(" ");
  const first = zone.polygon[0];
  const { rate, opacity } = getZoneShadeFromInputAndFrame({
    zone,
    input,
    frame,
  });
  return (
    <g
      data-zone={zone.id}
      data-records={zone.records}
      data-population={zone.population}
      data-rate={rate}
    >
      <ZoneGround
        zoneId={zone.id}
        points={points}
        first={first}
        index={index}
        frame={frame}
        accent={accent}
      />
      <ZoneSurface
        zoneId={zone.id}
        points={points}
        lift={lift}
        accent={accent}
        opacity={opacity}
      />
      <path
        d={`M${55 + first[0] * 5} ${180 + first[1] * 2.5} v${-lift}`}
        stroke={accent}
        strokeOpacity={0.5}
      />
    </g>
  );
}

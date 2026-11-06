import { ZoneFraction } from "./ZoneFraction";
import type { Input } from "./PopulationNormalizedMap.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Stable named fraction shelves remain legible for arbitrarily small polygons.
 */
export function ZoneFractions({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.zones.map((zone, index) => (
        <ZoneFraction
          key={zone.id}
          zone={zone}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}

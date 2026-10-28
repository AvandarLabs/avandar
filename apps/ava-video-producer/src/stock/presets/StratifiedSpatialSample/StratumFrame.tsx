import { STOCK } from "../../stockPalette";
import { StratumRegion } from "./StratumRegion";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Supplied boundaries retain a denominator for every authored stratum. */
export function StratumFrame({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={60}
        y={160}
        width={500}
        height={290}
        rx={8}
        fill={STOCK.surface}
      />
      {input.strata.map((stratum, index) => (
        <StratumRegion
          key={stratum.id}
          input={input}
          stratum={stratum}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}

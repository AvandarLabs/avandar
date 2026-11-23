import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { StratumRegion } from "./StratumRegion/StratumRegion";
import type { Input } from "./StratifiedSpatialSample.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Supplied boundaries retain a denominator for every authored stratum. */
export function StratumFrame({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <rect
        x={60}
        y={160}
        width={500}
        height={290}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
      />
      {input.strata.map((stratum, index) => {
        return (
          <StratumRegion
            key={stratum.id}
            input={input}
            stratum={stratum}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
    </g>
  );
}

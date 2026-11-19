import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { MeasurementRuler } from "./MeasurementRuler";
import type { Input } from "./PublicWorksMeasurementCheck.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/**
 * One physical dimension uses the same 65-pixel unit for promise and object.
 */
export function MeasuredStructure({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const promisedWidth = input.specification.length * 65;
  const observedWidth = input.observation.length * 65;
  return (
    <g>
      <StockRect
        data-promised-outline=""
        x={200}
        y={266}
        width={promisedWidth}
        height={94}
        fill="none"
        stroke={tokens.color.inactive}
        strokeDasharray="6 5"
      />
      <StockRect
        data-actual-structure={input.structure}
        x={200}
        y={275}
        width={observedWidth}
        height={input.structure === "low-wall" ? 85 : 10}
        fill={input.structure === "low-wall" ? tokens.color.surface : accent}
        stroke={accent}
      />
      {input.structure === "low-wall" ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M200 305 H${200 + observedWidth} M200 335 H${200 + observedWidth}`,
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          opacity={tokens.alpha.dimmed}
        />
      ) : (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M200 285 V360 M${200 + observedWidth} 285 V360`,
          }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(6)}
        />
      )}
      <MeasurementRuler />
    </g>
  );
}

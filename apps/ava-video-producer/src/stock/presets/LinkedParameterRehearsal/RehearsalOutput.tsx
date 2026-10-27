import { ramp } from "../../../motion";
import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { evaluateAffineRule } from "./evaluateAffineRule";
import { RehearsalRuler } from "./RehearsalRuler";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";
type Props = {
  output: Input["outputs"][number];
  source: Input["source"];
  value: number;
  index: number;
  frame: number;
  accent: string;
  sourceX: number;
  showRules: boolean;
  showBaselineMarkers: boolean;
};
/**
 * A pointer follows its direct affine rule with a coupling only when
 * dependent.
 */
export function RehearsalOutput({
  output,
  source,
  value,
  index,
  frame,
  accent,
  sourceX,
  showRules,
  showBaselineMarkers,
}: Readonly<Props>): ReactNode {
  const computed = evaluateAffineRule({
    source: value,
    multiplier: output.multiplier,
    offset: output.offset,
  });
  const baseline = evaluateAffineRule({
    source: source.baseline,
    multiplier: output.multiplier,
    offset: output.offset,
  });
  const pointerX =
    380 +
    270 *
      normalizeFiniteRange({
        value: computed,
        min: output.min,
        max: output.max,
      });
  const baselineX =
    380 +
    270 *
      normalizeFiniteRange({
        value: baseline,
        min: output.min,
        max: output.max,
      });
  const y = 252 + index * 90;
  const color = output.multiplier === 0 ? STOCK.muted : accent;
  return (
    <g opacity={ramp(frame, 16 + index * 3, 16)}>
      {output.multiplier !== 0 ? (
        <path
          data-coupling-id={output.id}
          d={`M${sourceX} 170 V${192 + index * 5} H${348 + index * 6} V${y} H${pointerX}`}
          fill="none"
          stroke={accent}
          strokeOpacity={0.24}
        />
      ) : undefined}
      <RehearsalRuler
        label={output.label}
        unit={output.unit}
        min={output.min}
        max={output.max}
        value={computed}
        y={y}
      />
      {showBaselineMarkers ? (
        <circle
          data-baseline-id={output.id}
          cx={baselineX}
          cy={y}
          r={9}
          fill="none"
          stroke={color}
          strokeOpacity={0.5}
        />
      ) : undefined}
      <circle
        data-output-id={output.id}
        data-value={computed}
        cx={pointerX}
        cy={y}
        r={5}
        fill={color}
      />
      {showRules ? (
        <FitText
          text={`${output.multiplier} × ${source.label} + (${output.offset})`}
          x={32}
          y={y + 56}
          width={896}
          fontSize={12}
          maxLines={1}
          breakLongWords
          normalizeWhitespace
          color={STOCK.muted}
        />
      ) : undefined}
    </g>
  );
}

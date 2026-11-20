import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";
/** Data for Props. */
type PropsCell = { x: number; y: number; width: number; height: number };
type Props = {
  cell: Input["cells"][number] & PropsCell;
  metric: Input["metric"];
  accent: string;
  patternId: string;
};
/** The tint of an observed cell with the weakest reading. */
const OBSERVED_TINT_FLOOR = 0.12;
/** How much the tint grows from the weakest to the strongest reading. */
const OBSERVED_TINT_RANGE = 0.36;
/** Unknown values keep their hatch, independently of all point observations. */
export function ObservationCell({
  cell,
  metric,
  accent,
  patternId,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const value = cell.value;
  const strength =
    value === null
      ? 0
      : normalizeFiniteRange({
          value,
          min: metric.minimum,
          max: metric.maximum,
        });
  return (
    <g data-observation-cell={cell.id}>
      <StockRect
        data-missing-cell={value === null ? cell.id : undefined}
        x={cell.x}
        y={cell.y}
        width={cell.width}
        height={cell.height}
        fill={value === null ? `url(#${patternId})` : accent}
        fillOpacity={
          value === null
            ? 1
            : scales.wash(OBSERVED_TINT_FLOOR + strength * OBSERVED_TINT_RANGE)
        }
        stroke={tokens.color.line}
      />
      <FitText
        text={cell.label}
        x={cell.x + 10}
        y={cell.y + 14}
        width={cell.width - 20}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={value === null ? "?" : String(value)}
        x={cell.x + 10}
        y={cell.y + 58}
        width={cell.width - 20}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}

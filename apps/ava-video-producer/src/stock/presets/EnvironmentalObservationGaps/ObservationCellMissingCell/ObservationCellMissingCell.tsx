import { StockRect } from "../../../primitives/StockRect";
import type { normalizeFiniteRange } from "../../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type {
  ObservationCellObservedTintFloorValue,
  ObservationCellObservedTintRangeValue,
} from "../ObservationCell";
import type { ReactNode } from "react";

type Props = {
  value: (Input["cells"][number] & PropsCell)["value"];
  cell: Input["cells"][number] & PropsCell;
  patternId: string;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  observedTintFloor: ObservationCellObservedTintFloorValue;
  strength: number | ReturnType<typeof normalizeFiniteRange>;
  observedTintRange: ObservationCellObservedTintRangeValue;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
};

/** Renders the missing cell with authored geometry. */
export function ObservationCellMissingCell({
  value,
  cell,
  patternId,
  accent,
  scales,
  observedTintFloor: OBSERVED_TINT_FLOOR,
  strength,
  observedTintRange: OBSERVED_TINT_RANGE,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
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
  );
}
type PropsCell = { x: number; y: number; width: number; height: number };

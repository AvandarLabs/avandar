import { normalizeFiniteRange } from "../../numeric/normalizeFiniteRange/normalizeFiniteRange";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ObservationCellCopy } from "./ObservationCellCopy/ObservationCellCopy";
import { ObservationCellMissingCell } from "./ObservationCellMissingCell/ObservationCellMissingCell";
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
      <ObservationCellMissingCell
        {...{ value, cell, patternId, accent, scales }}
        observedTintFloor={OBSERVED_TINT_FLOOR}
        strength={strength}
        observedTintRange={OBSERVED_TINT_RANGE}
        tokens={tokens}
      />
      <ObservationCellCopy cell={cell} value={value} />
    </g>
  );
}

/** The type of `OBSERVED_TINT_FLOOR` used by ObservationCell. */
export type ObservationCellObservedTintFloorValue = typeof OBSERVED_TINT_FLOOR;

/** The type of `OBSERVED_TINT_RANGE` used by ObservationCell. */
export type ObservationCellObservedTintRangeValue = typeof OBSERVED_TINT_RANGE;

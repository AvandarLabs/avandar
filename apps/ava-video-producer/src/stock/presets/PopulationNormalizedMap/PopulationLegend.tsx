import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { LegendScale } from "./LegendScale";
import type { Input } from "./PopulationNormalizedMap.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** The changed measure has an explicit legend and unchanged period and base. */
export function PopulationLegend({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const isNormalized = frame >= 72;
  const maximum = isNormalized
    ? input.colorDomains.normalizedMaximum
    : input.colorDomains.countMaximum;
  return (
    <g
      data-legend-measure={isNormalized ? "normalized" : "count"}
      data-legend-maximum={maximum}
    >
      <LegendScale accent={accent} />
      <line x1={40} x2={620} y1={515} y2={515} stroke={STOCK.muted} />
      <LabelSlots
        labels={[
          [input.copy.context, 40, 36, 880, 18, 2],
          [
            isNormalized ? input.copy.normalizedLegend : input.copy.countLegend,
            40,
            82,
            880,
            14,
            1,
          ],
          [`0 – ${maximum}`, 300, 112, 620, 12, 1],
          [input.copy.records, 40, 500, 580, 12, 1],
          [input.copy.population, 40, 539, 580, 12, 1],
          [input.copy.per, 660, 510, 290, 12, 3],
          [input.periodLabel, 40, 578, 600, 12, 1],
          [String(input.rateBase), 660, 578, 250, 14, 1],
        ]}
      />
      {isNormalized ? (
        <LabelSlots labels={[[String(input.rateBase), 40, 140, 200, 12, 1]]} />
      ) : undefined}
    </g>
  );
}

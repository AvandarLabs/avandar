import { STOCK } from "../../stockPalette";
import { ClassLegendHeading } from "./ClassLegendHeading";
import { ClassRange } from "./ClassRange";
import { MissingClassKey } from "./MissingClassKey";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type Props = {
  scheme: Input["schemes"][number];
  index: number;
  accent: string;
  unitLabel: string;
  noDataLabel: string;
};
/** One authored classification legend retains all three distinct categories. */
export function ClassLegend({
  scheme,
  index,
  accent,
  unitLabel,
  noDataLabel,
}: Readonly<Props>): ReactNode {
  const offset = index * 224;
  return (
    <g data-class-legend-index={index}>
      <ClassLegendHeading {...{ scheme, offset, unitLabel }} />
      <ClassRange
        lower={scheme.breaks[0]}
        upper={scheme.breaks[1]}
        y={244 + offset}
        color={STOCK.cyan}
        isFinal={false}
      />
      <ClassRange
        lower={scheme.breaks[1]}
        upper={scheme.breaks[2]}
        y={280 + offset}
        color={accent}
        isFinal
      />
      <MissingClassKey text={noDataLabel} y={318 + offset} />
    </g>
  );
}

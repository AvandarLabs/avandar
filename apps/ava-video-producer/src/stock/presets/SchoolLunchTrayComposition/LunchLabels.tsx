import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { LunchLegend } from "./LunchLegend";
import { LunchTally } from "./LunchTally";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string; frame: number };
/** The named plan legend remains visible when direct compartment names hide. */
export function LunchLabels({
  input,
  accent,
  frame,
}: Readonly<Props>): ReactNode {
  const complete = input.trays.filter(
    (tray) => tray.componentIds.length === input.plannedComponents.length,
  ).length;
  return (
    <g>
      <FitText
        text={input.labels.plan}
        x={48}
        y={34}
        width={864}
        fontSize={20}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      <LunchLegend input={input} accent={accent} />
      <LunchTally input={input} frame={frame} complete={complete} />
      <FitText
        text={input.caption}
        x={48}
        y={589}
        width={864}
        fontSize={12}
        maxLines={1}
        color={STOCK.muted}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}

import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { AtomicCell } from "./AtomicCell";
import { GroupingLedger } from "./GroupingLedger";
import { GroupingSeams } from "./GroupingSeams";
import { GroupingTotals } from "./GroupingTotals";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./BoundaryRegroupingEffect.schema";
import type { ReactNode } from "react";
/** Explicit authored scene props. */
export type Props = GraphicProps & { input: Input };
/**
 * BoundaryRegroupingEffect renders the supplied quantities and explicit
 * timeline.
 */
export function BoundaryRegroupingEffect({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const records = input.cells.reduce((total, cell) => total + cell.records, 0);
  const population = input.cells.reduce(
    (total, cell) => total + cell.population,
    0,
  );
  return (
    <g data-overall-records={records} data-overall-population={population}>
      <LabelSlots labels={[[input.copy.context, 60, 32, 840, 16, 2]]} />
      {input.cells.map((cell) => (
        <AtomicCell
          key={cell.id}
          cell={cell}
          showValues={input.showCellValues}
        />
      ))}
      <GroupingSeams input={input} frame={frame} accent={accent} />
      <GroupingLedger input={input} frame={frame} accent={accent} />
      <GroupingTotals input={input} records={records} population={population} />
    </g>
  );
}

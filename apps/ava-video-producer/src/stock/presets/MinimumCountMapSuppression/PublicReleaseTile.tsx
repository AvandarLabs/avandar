import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { PublicCellSymbol } from "./PublicCellSymbol";
import type { makePublicCellsFromInput } from "./makePublicCellsFromInput";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";

type Props = {
  cell: ReturnType<typeof makePublicCellsFromInput>[number];
  labels: Input["labels"];
  accent: string;
};
/** Public tile props omit every local suppressed count. */
export function PublicReleaseTile({
  cell,
  labels,
  accent,
}: Readonly<Props>): ReactNode {
  const x = 550 + (cell.index % 2) * 190;
  const y = 170 + Math.floor(cell.index / 2) * 100;
  return (
    <g data-public-state={cell.status}>
      <rect
        data-public-tile={cell.id}
        x={x}
        y={y}
        width={170}
        height={88}
        rx={8}
        fill="none"
        stroke={cell.status === "released" ? accent : STOCK.line}
      />
      <LabelSlots labels={[[cell.label, x + 12, y + 20, 146, 12, 3]]} />
      <PublicCellSymbol status={cell.status} labels={labels} x={x} y={y} />
    </g>
  );
}

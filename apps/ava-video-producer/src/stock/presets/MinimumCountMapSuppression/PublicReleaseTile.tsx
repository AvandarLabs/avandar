import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const x = 550 + (cell.index % 2) * 190;
  const y = 170 + Math.floor(cell.index / 2) * 100;
  return (
    <g data-public-state={cell.status}>
      <StockRect
        data-public-tile={cell.id}
        x={x}
        y={y}
        width={170}
        height={88}
        rx={scales.corner(tokens.corner.cell)}
        fill="none"
        stroke={cell.status === "released" ? accent : tokens.color.line}
      />
      <LabelSlots labels={[[cell.label, x + 12, y + 20, 146, 12, 3]]} />
      <PublicCellSymbol status={cell.status} labels={labels} x={x} y={y} />
    </g>
  );
}

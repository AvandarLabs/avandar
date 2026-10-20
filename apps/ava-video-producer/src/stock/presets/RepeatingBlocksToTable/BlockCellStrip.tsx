import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getBlockCellGeometryFromFrame } from "./getBlockCellGeometryFromFrame";
import type { Input } from "./RepeatingBlocksToTable.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  frame: number;
  accent: string;
  blockIndex: number;
  fieldIndex: number;
};
/** Field identity travels with its value as block stacks become table rows. */
export function BlockCellStrip({
  input,
  frame,
  accent,
  blockIndex,
  fieldIndex,
}: Readonly<Props>): ReactNode {
  const field = input.fields[fieldIndex],
    block = input.blocks[blockIndex];
  const value = block.cells.find(({ fieldId }) => fieldId === field.id)!.text;
  const { x, y, width } = getBlockCellGeometryFromFrame({
    input,
    frame,
    blockIndex,
    fieldIndex,
  });
  const color = [accent, STOCK.cyan, STOCK.orange][blockIndex];
  return (
    <g data-field={field.id} data-cell-value={value ?? input.missingLabel}>
      <rect
        data-transfer-cell={`${blockIndex}:${fieldIndex}`}
        x={x}
        y={y - 44}
        width={width}
        height={108}
        rx={5}
        fill={STOCK.surface}
        stroke={value === null ? STOCK.orange : color}
        strokeDasharray={value === null ? "4 3" : undefined}
      />
      <LabelSlots
        labels={[
          [field.label, x + 10, y - 30, width - 20, 12, 3],
          [value ?? input.missingLabel, x + 10, y + 25, width - 20, 12, 3],
        ]}
      />
    </g>
  );
}

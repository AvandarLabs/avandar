import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getBlockCellGeometryFromFrame } from "../getBlockCellGeometryFromFrame";
import { TransferCell } from "./TransferCell";
import type { Input } from "../RepeatingBlocksToTable.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  blockIndex: number;
  fieldIndex: number;
};
function _getCellText({
  block,
  fieldId,
}: Readonly<{
  block: Input["blocks"][number];
  fieldId: string;
}>): string | null {
  const cell = block.cells.find(propEq("fieldId", fieldId));
  if (!cell) {
    throw new Error(`Missing block cell for field: ${fieldId}`);
  }
  return cell.text;
}
/** Field identity travels with its value as block stacks become table rows. */
export function BlockCellStrip({
  input,
  frame,
  accent,
  blockIndex,
  fieldIndex,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const field = input.fields[fieldIndex],
    block = input.blocks[blockIndex];
  // RepeatingBlocksToTable.schema verifies exactly one keyed cell for
  // every field in each block.
  const value = _getCellText({ block, fieldId: field.id });
  const { x, y, width } = getBlockCellGeometryFromFrame({
    motion,
    input,
    frame,
    blockIndex,
    fieldIndex,
  });
  const color = [accent, tokens.color.accentAlt, tokens.color.highlight][
    blockIndex
  ];
  return (
    <g data-field={field.id} data-cell-value={value ?? input.missingLabel}>
      <TransferCell
        cellKey={`${blockIndex}:${fieldIndex}`}
        x={x}
        y={y}
        width={width}
        isMissing={value === null}
        color={color}
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

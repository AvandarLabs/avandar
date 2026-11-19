import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
/** The dash of a missing cell's outline. */
const MISSING_DASH = "4 3";
/** Field identity travels with its value as block stacks become table rows. */
export function BlockCellStrip({
  input,
  frame,
  accent,
  blockIndex,
  fieldIndex,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const field = input.fields[fieldIndex],
    block = input.blocks[blockIndex];
  const value = block.cells.find(({ fieldId }) => {
    return fieldId === field.id;
  })!.text;
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
      <StockRect
        data-transfer-cell={`${blockIndex}:${fieldIndex}`}
        x={x}
        y={y - 44}
        width={width}
        height={108}
        rx={scales.corner(5)}
        fill={tokens.color.surface}
        stroke={value === null ? tokens.color.highlight : color}
        strokeDasharray={value === null ? MISSING_DASH : undefined}
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

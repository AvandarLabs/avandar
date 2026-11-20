import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTheme,
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

/** A cell's frame, dashed in the highlight when its value is missing. */
function TransferCell({
  cellKey,
  x,
  y,
  width,
  isMissing,
  color,
}: Readonly<{
  cellKey: string;
  x: number;
  y: number;
  width: number;
  isMissing: boolean;
  color: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const { atomic } = useGraphicTheme();
  const scales = useGraphicShapeScales();
  return (
    <StockRect
      data-transfer-cell={cellKey}
      x={x}
      y={y - 44}
      width={width}
      height={108}
      rx={scales.corner(5)}
      fill={tokens.color.surface}
      stroke={isMissing ? tokens.color.highlight : color}
      strokeDasharray={isMissing ? atomic.dash.tight.join(" ") : undefined}
    />
  );
}

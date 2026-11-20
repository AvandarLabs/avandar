import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPickerCopyFromFrame } from "./getPickerCopyFromFrame";
import type { PickerValueGroup } from "./getPickerGroupsFromInput";
import type { Input } from "./GroupedValuePicker.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
  groups: readonly PickerValueGroup[];
};
/** A value copy's corner before the corner style scales it. */
const COPY_CORNER = 3;
/** A complete source value becomes a readable stack or calculation operand. */
export function PickerValueCopy({
  input,
  index,
  frame,
  accent,
  groups,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const copy = getPickerCopyFromFrame({ input, index, frame, groups, motion });
  if (!copy) {
    return null;
  }
  return (
    <g data-picker-copy={copy.id} opacity={copy.opacity}>
      <StockRect
        data-picker-copy-body={copy.id}
        x={copy.x - 3}
        y={copy.y - 14}
        width={copy.text === "∅" ? 20 : 134}
        height={copy.height}
        rx={scales.corner(COPY_CORNER)}
        fill={tokens.color.elevated}
        stroke={accent}
      />
      <LabelSlots labels={[[copy.text, copy.x, copy.y, 128, 12, 2]]} />
    </g>
  );
}

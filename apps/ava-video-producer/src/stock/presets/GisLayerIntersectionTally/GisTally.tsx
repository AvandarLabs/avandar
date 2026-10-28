import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import type { Input } from "./GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  selectedQuantity: number;
  totalQuantity: number;
};
type Slot = [
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: FitTextSize,
  maxLines: number,
  color?: string,
];
/**
 * Authored labels occupy fixed slots with complete text at every accepted
 * bound.
 */
export function GisTally({
  input,
  frame,
  selectedQuantity,
  totalQuantity,
}: Readonly<Props>): ReactNode {
  const slots: Slot[] = [
    [input.copy.selected, 40, 488, 240, 12, 4],
    [input.copy.total, 300, 488, 240, 12, 4],
    [`${selectedQuantity} / ${totalQuantity}`, 40, 574, 160, 24, 1],
    [input.copy[input.measure], 220, 556, 320, 14, 3],
  ];
  return (
    <g
      opacity={frame >= 108 ? 1 : 0}
      data-selected-quantity={selectedQuantity}
      data-total-quantity={totalQuantity}
    >
      {slots.map(([text, x, y, width, fontSize, maxLines, color], index) => (
        <FitText
          key={index}
          {...{ text, x, y, width, fontSize, maxLines, color }}
          breakLongWords
          normalizeWhitespace
        />
      ))}
    </g>
  );
}

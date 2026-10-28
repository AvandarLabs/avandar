import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { STOCK } from "../../stockPalette";
import { GisTally } from "./GisTally";
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
export function GisLabels({
  input,
  frame,
  selectedQuantity,
  totalQuantity,
}: Readonly<Props>): ReactNode {
  const slots: Slot[] = [
    [input.copy.context, 40, 35, 880, 16, 1],
    [
      input.operation === "intersection"
        ? input.copy.intersection
        : input.copy.difference,
      40,
      79,
      880,
      16,
      1,
    ],
    ...input.layers.map((layer, index): Slot => [
      layer.label,
      40 + index * 270,
      119,
      250,
      14,
      3,
      index ? STOCK.mint : STOCK.cyan,
    ]),
  ];
  return (
    <g>
      {slots.map(([text, x, y, width, fontSize, maxLines, color], index) => (
        <FitText
          key={index}
          {...{ text, x, y, width, fontSize, maxLines, color }}
          breakLongWords
          normalizeWhitespace
        />
      ))}
      <GisTally {...{ input, frame, selectedQuantity, totalQuantity }} />
    </g>
  );
}

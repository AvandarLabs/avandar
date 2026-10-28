import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { STOCK } from "../../stockPalette";
import { ClassroomRoster } from "./ClassroomRoster";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
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
export function ClassroomLabels({ input, frame }: Readonly<Props>): ReactNode {
  const slots: Slot[] = [
    [input.activity.label, 48, 38, 864, 20, 1],
    [
      frame < 72 ? input.phaseLabels.before : input.phaseLabels.after,
      48,
      78,
      864,
      16,
      1,
    ],
    [input.caption, 48, 589, 864, 12, 1, STOCK.muted],
    ...input.adaptations.map((adaptation, index): Slot => [
      adaptation.label,
      48 + index * 300,
      525,
      276,
      14,
      3,
      STOCK.mint,
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
      <ClassroomRoster input={input} />
    </g>
  );
}

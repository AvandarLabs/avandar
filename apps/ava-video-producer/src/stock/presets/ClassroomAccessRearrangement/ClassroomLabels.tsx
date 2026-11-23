import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
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
    [input.caption, 48, 589, 864, 12, 1, tokens.color.inactive],
    ...input.adaptations.map((adaptation, index): Slot => {
      return [
        adaptation.label,
        48 + index * 300,
        525,
        276,
        14,
        3,
        tokens.color.positive,
      ];
    }),
  ];
  return (
    <g>
      {slots.map(([text, x, y, width, fontSize, maxLines, color]) => {
        return (
          <FitText
            key={`${x}:${y}`}
            {...{ text, x, y, width, fontSize, maxLines, color }}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
      <ClassroomRoster input={input} />
    </g>
  );
}

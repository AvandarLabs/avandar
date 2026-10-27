import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PracticeToWorkSample.schema";
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
export function PracticeLabels({ input, frame }: Readonly<Props>): ReactNode {
  const slots: Slot[] = [
    [input.task.instruction, 48, 38, 864, 20, 1],
    [input.settingLabels.practice, 48, 91, 390, 16, 3],
    [input.settingLabels.application, 510, 91, 390, 16, 3],
    [input.workpieces.applicationLabel, 590, 520, 300, 16, 3],
    [input.caption, 48, 589, 864, 12, 1, STOCK.muted],
    ...(input.showFirstArtifactAtHold || frame < 112
      ? ([[input.workpieces.practiceLabel, 100, 520, 300, 16, 3]] as Slot[])
      : []),
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
    </g>
  );
}

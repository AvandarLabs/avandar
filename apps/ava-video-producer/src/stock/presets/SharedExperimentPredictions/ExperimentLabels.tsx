import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedExperimentPredictions.schema";
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
export function ExperimentLabels({ input, frame }: Readonly<Props>): ReactNode {
  const slots: Slot[] = [
    [input.labels.experiment, 40, 35, 880, 20, 1],
    [input.labels.prediction, 40, 86, 880, 16, 2],
    [input.caption, 40, 589, 880, 12, 1, STOCK.muted],
    ...(frame >= 108
      ? ([
          [input.labels.observation, 40, 506, 340, 14, 3],
          [
            `${input.observationDistance} ${input.track.unit}`,
            40,
            553,
            340,
            12,
            2,
          ],
        ] as Slot[])
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

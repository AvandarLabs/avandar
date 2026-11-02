import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SchoolLunchTrayComposition.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; complete: number };
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
export function LunchTally({
  input,
  frame,
  complete,
}: Readonly<Props>): ReactNode {
  const slots: Slot[] = [
    [`${complete} / ${input.trays.length}`, 48, 550, 110, 24, 1],
    [input.labels.matchesPlan, 180, 532, 230, 14, 3],
    [input.labels.plannedTrays, 440, 532, 220, 14, 3],
    ...(input.emphasizeMissingComponents
      ? ([[input.labels.missing, 690, 532, 220, 14, 3, STOCK.orange]] as Slot[])
      : []),
  ];
  return (
    <g
      opacity={frame >= 108 ? 1 : 0}
      data-complete-trays={complete}
      data-planned-trays={input.trays.length}
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

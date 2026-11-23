import { FitText } from "../../../primitives/FitText/FitText";
import type { FitTextSize } from "../../../primitives/FitText/wrapTextToLines";
import type { ReactNode } from "react";

type Props = {
  slots: Slot[];
};

/** Renders the slots layer with authored geometry. */
export function GisCaptionSlots({ slots }: Readonly<Props>): ReactNode {
  return (
    <>
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
    </>
  );
}
type Slot = [
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: FitTextSize,
  maxLines: number,
  color?: string,
];

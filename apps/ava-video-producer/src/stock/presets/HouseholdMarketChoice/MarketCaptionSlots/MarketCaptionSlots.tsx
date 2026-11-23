import { FitText } from "../../../primitives/FitText/FitText";
import type { FitTextSize } from "../../../primitives/FitText/wrapTextToLines";
import type { ReactNode } from "react";

type Props = {
  labels: Array<[string, number, number, number, FitTextSize]>;
};

/** Renders the text label with authored geometry. */
export function MarketCaptionSlots({ labels }: Readonly<Props>): ReactNode {
  return (
    <>
      {labels.map(([text, x, y, width, fontSize]) => {
        return (
          <FitText
            key={`${x}:${y}`}
            {...{ text, x, y, width, fontSize }}
            maxLines={3}
            normalizeWhitespace
            breakLongWords
          />
        );
      })}
    </>
  );
}

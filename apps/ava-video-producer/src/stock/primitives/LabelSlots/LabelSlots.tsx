import { FitText } from "../FitText/FitText";
import { type FitTextSize } from "../FitText/wrapTextToLines";
import type { ReactNode } from "react";
type Label = [
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: FitTextSize,
  maxLines: number,
];
/** Inputs for LabelSlots. */
type Props = { labels: readonly Label[] };

/** Fixed label slots retain original authored copy and whole graphemes. */
export function LabelSlots({ labels }: Readonly<Props>): ReactNode {
  return (
    <g>
      {labels.map(([text, x, y, width, fontSize, maxLines], index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={fontSize}
          maxLines={maxLines}
          normalizeWhitespace
          breakLongWords
        />
      ))}
    </g>
  );
}

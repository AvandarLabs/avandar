import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { content: string[]; x: number };
/** Each retained snapshot preserves all of its authored content lines. */
export function SavedRevisionLines({ content, x }: Readonly<Props>): ReactNode {
  return (
    <g>
      {content.map((line, lineIndex) => (
        <FitText
          key={lineIndex}
          text={line}
          x={x + 10}
          y={438 + lineIndex * 43}
          width={185}
          maxLines={3}
          fontSize={12}
          normalizeWhitespace
          breakLongWords
          color={STOCK.muted}
        />
      ))}
    </g>
  );
}

import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  content: Array<string | undefined>;
  previous: string[];
  selected: string[];
  frame: number;
};
/** Positional line slots replace current text and clear change notches. */
export function RevisionCurrentLines({
  input,
  content,
  previous,
  selected,
  frame,
}: Readonly<Props>): ReactNode {
  const numLines = Math.max(previous.length, selected.length);
  return (
    <g>
      {Array.from({ length: numLines }, (_, index) => (
        <g key={index}>
          {content[index] !== undefined ? (
            <FitText
              text={content[index]}
              x={294}
              y={176 + index * 53}
              width={370}
              fontSize={16}
              maxLines={3}
              normalizeWhitespace
              breakLongWords
            />
          ) : undefined}
          {input.showChangedLines &&
          frame < 126 &&
          previous[index] !== selected[index] ? (
            <path
              data-change-notch={index}
              d={`M278 ${168 + index * 53} h8`}
              stroke={STOCK.orange}
              strokeWidth={4}
            />
          ) : undefined}
        </g>
      ))}
    </g>
  );
}

import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string };
/**
 * Response lines are literal authored content whose quantity owns the writing
 * strokes.
 */
export function ResponseWriting({ input, accent }: Readonly<Props>): ReactNode {
  const labels = [
    { text: input.response.label, y: 354, maxLines: 1, color: accent },
    ...input.response.lines.map((text, index) => ({
      text,
      y: 378 + index * 34,
      maxLines: 2,
      color: STOCK.text,
    })),
  ];
  return (
    <g>
      {input.showLabels
        ? labels.map((label) => (
            <FitText
              key={label.y}
              {...label}
              x={214}
              width={532}
              fontSize={12}
              normalizeWhitespace
              breakLongWords
            />
          ))
        : input.response.lines.map((_, index) => (
            <path
              data-response-stroke={index}
              key={index}
              d={`M214 ${378 + index * 34} h${490 - index * 32}`}
              stroke={accent}
              strokeWidth={3}
            />
          ))}
    </g>
  );
}

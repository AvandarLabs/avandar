import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PairedContrast.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input };
/** The same question and caption frame both alternatives. */
export function ContrastHeading({ frame, input }: Readonly<Props>): ReactNode {
  const headings = [
    {
      text: input.question,
      y: 56,
      fontSize: 24 as const,
      maxLines: 3,
      color: STOCK.text,
      opacity: ramp(frame, 18, 18),
    },
    {
      text: input.comparisonLabel,
      y: 572,
      fontSize: 16 as const,
      maxLines: 2,
      color: STOCK.muted,
      opacity: ramp(frame, 108, 12),
    },
  ];
  return (
    <g>
      {headings.map(({ opacity, ...label }, index) => (
        <g key={index} opacity={opacity} aria-label={label.text}>
          <FitText
            {...label}
            x={480}
            width={840}
            breakLongWords
            normalizeWhitespace
            anchor="middle"
          />
        </g>
      ))}
    </g>
  );
}

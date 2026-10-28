import { ramp, EASE } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode, ComponentProps } from "react";

type HeadingSlot = Omit<ComponentProps<typeof FitText>, "x" | "width"> & {
  opacity: number;
};
type Props = { input: Input; frame: number; accent: string };
/** Authored stage captions change as the presentation is refined. */
export function ChartHeadings({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const refinement = ramp(frame, 40, 72, EASE.inOut);
  const slots: HeadingSlot[] = [
    {
      text: input.headings.title,
      y: 50,
      fontSize: 24,
      maxLines: 2,
      opacity: 1,
    },
    {
      text: input.headings.before,
      y: 119,
      fontSize: 14,
      maxLines: 1,
      color: STOCK.muted,
      opacity: 1 - refinement,
    },
    {
      text: input.treatment === "direct-labels" ? input.headings.after : "",
      y: 119,
      fontSize: 14,
      maxLines: 1,
      color: accent,
      opacity: refinement,
    },
  ];
  return (
    <g>
      {slots.map(({ opacity, ...label }, index) => (
        <g key={index} opacity={opacity}>
          <FitText
            {...label}
            x={64}
            width={832}
            breakLongWords
            normalizeWhitespace
          />
        </g>
      ))}
    </g>
  );
}

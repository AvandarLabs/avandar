import { EASE, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode } from "react";

type Props = {
  category: Input["categories"][number];
  input: Input;
  y: number;
  frame: number;
  accent: string;
};
/** Both focus-bearing treatments place context beside the selected mark. */
export function CategoryContextHeading({
  category,
  input,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  if (input.treatment === "direct-labels" || input.focusId !== category.id) {
    return undefined;
  }
  const direct = input.treatment === "both";
  const opacity = direct
    ? ramp(frame, 104, 8, EASE.inOut)
    : ramp(frame, 40, 72, EASE.inOut);
  return (
    <g data-context={category.id} opacity={opacity}>
      <FitText
        text={input.headings.after}
        x={344}
        y={y - 12}
        width={520}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        color={accent}
      />
    </g>
  );
}

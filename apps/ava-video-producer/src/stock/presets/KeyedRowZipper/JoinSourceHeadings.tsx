import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";
/** Inputs for JoinSourceHeadings. */
type Props = { frame: number; input: Input };

/** Source headings identify the values and the facing key cells. */
export function JoinSourceHeadings({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={1 - ramp(frame, 90, 18)}>
      <FitText
        text={input.labels.left}
        x={44}
        y={110}
        width={390}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.labels.right}
        x={500}
        y={110}
        width={390}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.labels.key}
        x={480}
        y={140}
        width={410}
        fontSize={12}
        maxLines={1}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}

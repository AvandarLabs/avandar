import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { DuplicateDecisionLabels } from "./DuplicateDecisionLabels";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  x: number;
  y: number;
  isPair: boolean;
  progress: number;
  accent: string;
};
/** Comparison rulers and headings track the actual candidate group frame. */
export function DuplicateGroupHeading({
  frame,
  input,
  group,
  x,
  y,
  isPair,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d={`M${x - 6} ${y - 65}v-8h${mix(isPair ? progress : 0, 432, 904)}v8`}
        fill="none"
        stroke={STOCK.line}
      />
      <FitText
        text={group.label}
        x={x}
        y={y - 50}
        width={416}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      <DuplicateDecisionLabels
        frame={frame}
        labels={input.labels}
        isResolved={group.retainedId !== null}
        x={x}
        y={y}
        isPair={isPair}
        progress={progress}
      />
      <path
        data-comparison-ruler={group.id}
        d={`M${x + 4} ${y}v${isPair ? 112 : 360}`}
        fill="none"
        stroke={accent}
        opacity={ramp(frame, 42, 28) * (1 - progress)}
      />
    </g>
  );
}

import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  progress: number;
  isPractice: boolean;
  accent: string;
};
/** Measurement Mark for the authored scene. */
export function MeasurementMark({
  input,
  progress,
  isPractice,
  accent,
}: Readonly<Props>): ReactNode {
  return progress > 0 ? (
    <g data-measured-value={input.task.value}>
      <path
        data-measurement-mark={isPractice ? "practice" : "application"}
        d={`M30 60 H${30 + input.task.value * 12 * progress}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <path
        d={`M30 54 V66 M${30 + input.task.value * 12} 54 V66`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
        opacity={progress}
      />
      <FitText
        text={`${input.task.value} ${input.task.unit}`}
        x={30}
        y={95}
        width={180}
        fontSize={14}
        maxLines={1}
        normalizeWhitespace
        breakLongWords
      />
    </g>
  ) : undefined;
}

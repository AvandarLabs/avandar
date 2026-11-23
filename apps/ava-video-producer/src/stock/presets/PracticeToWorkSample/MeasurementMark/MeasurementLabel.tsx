import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../PracticeToWorkSample.schema";
import type { ReactNode } from "react";

type Props = { task: Input["task"] };

/** The measured value and its unit, under the mark. */
export function MeasurementLabel({ task }: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={`${task.value} ${task.unit}`}
      x={30}
      y={95}
      width={180}
      fontSize={14}
      maxLines={1}
      normalizeWhitespace
      breakLongWords
    />
  );
}

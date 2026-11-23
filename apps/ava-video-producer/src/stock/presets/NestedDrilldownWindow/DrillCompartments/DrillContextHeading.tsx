import { FitText } from "../../../primitives/FitText/FitText";
import { DrillTiming } from "../DrillTiming";
import type { useDrillCompartmentsPresentation } from "./useDrillCompartmentsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useDrillCompartmentsPresentation>,
  "frame" | "input"
>;
/** Render the drill context heading. */
export function DrillContextHeading(props: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={
        props.frame < DrillTiming.CHILD_CUE
          ? props.input.dimensions[0]
          : props.input.labels.context
      }
      x={44}
      y={154}
      width={872}
      fontSize={14}
      maxLines={1}
      breakLongWords
      normalizeWhitespace
    />
  );
}

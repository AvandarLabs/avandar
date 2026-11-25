import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

type Props = {
  check: Input["fieldChecks"][number];
  index: number;
};

/** Renders the label label with authored geometry. */
export function ObservationFieldCheckLabel({
  check,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={check.label}
      x={52 + index * 310}
      y={479}
      width={270}
      fontSize={12}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}

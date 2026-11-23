import { FitText } from "../../../primitives/FitText/FitText";
import type { ChosenServiceAccess } from "../ChosenServiceAccess";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof ChosenServiceAccess>[0]["input"];
};

/** Renders the staff label with authored geometry. */
export function ChosenServiceAccessStaffLabel({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.labels.staff}
      x={530}
      y={524}
      width={380}
      fontSize={14}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
    />
  );
}

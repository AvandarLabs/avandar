import { FitText } from "../../primitives/FitText/FitText";
import type { useOutreachHouseholdRevisitsPresentation } from "./useOutreachHouseholdRevisitsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useOutreachHouseholdRevisitsPresentation>,
  "input"
>;
/** Render the outreach map caption. */
export function OutreachMapCaption(props: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={props.input.copy.map}
      x={50}
      y={78}
      width={540}
      fontSize={14}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}

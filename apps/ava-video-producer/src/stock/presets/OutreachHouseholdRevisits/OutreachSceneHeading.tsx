import { FitText } from "../../primitives/FitText/FitText";
import type { useOutreachHouseholdRevisitsPresentation } from "./useOutreachHouseholdRevisitsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useOutreachHouseholdRevisitsPresentation>,
  "input"
>;
/** Render the outreach scene heading. */
export function OutreachSceneHeading(props: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={props.input.sceneLabel}
      x={50}
      y={38}
      width={850}
      fontSize={14}
      maxLines={2}
      breakLongWords
      normalizeWhitespace
    />
  );
}

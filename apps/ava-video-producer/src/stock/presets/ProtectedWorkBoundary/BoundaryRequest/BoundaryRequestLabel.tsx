import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { useBoundaryRequestPresentation } from "./useBoundaryRequestPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useBoundaryRequestPresentation>,
  "input" | "position"
>;
/** Render the boundary request label. */
export function BoundaryRequestLabel(props: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [
          props.input.request.label,
          props.position.x + 7,
          props.position.y + 20,
          props.position.width - 14,
          12,
          5,
        ],
      ]}
    />
  );
}

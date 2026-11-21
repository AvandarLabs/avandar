import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { useReleaseRepairObligationsPresentation } from "./useReleaseRepairObligationsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useReleaseRepairObligationsPresentation>,
  "motion" | "frame" | "isHeld" | "input"
>;
/** Render the release disposition label. */
export function ReleaseDispositionLabel(props: Readonly<Props>): ReactNode {
  return (
    <g opacity={props.motion.reveal(props.frame, 91)}>
      <LabelSlots
        labels={[
          [
            props.isHeld ? props.input.labels.held : props.input.labels.ready,
            60,
            92,
            440,
            14,
            2,
          ],
        ]}
      />
    </g>
  );
}

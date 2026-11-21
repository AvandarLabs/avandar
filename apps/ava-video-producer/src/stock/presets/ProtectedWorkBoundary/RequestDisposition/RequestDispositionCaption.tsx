import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { useRequestDispositionPresentation } from "./useRequestDispositionPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useRequestDispositionPresentation>,
  "input"
>;
/** Render the request disposition caption. */
export function RequestDispositionCaption(props: Readonly<Props>): ReactNode {
  return (
    <g data-disposition-caption={props.input.request.placement}>
      <LabelSlots
        labels={[
          [
            props.input.request.placement === "defer"
              ? props.input.labels.deferred
              : props.input.labels.rescheduled,
            props.input.request.placement === "defer" ? 650 : 50,
            props.input.request.placement === "defer" ? 40 : 533,
            props.input.request.placement === "defer" ? 260 : 860,
            12,
            3,
          ],
        ]}
      />
    </g>
  );
}

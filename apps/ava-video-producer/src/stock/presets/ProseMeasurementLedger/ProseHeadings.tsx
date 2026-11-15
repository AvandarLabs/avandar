import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import {
  methodMessages,
  reviewMessages,
} from "./ProseMeasurementLedger.controls";
import type { Input } from "./ProseMeasurementLedger.schema";
import type { ReactNode } from "react";
/** Inputs for ProseHeadings. */
type Props = { input: Input; frame: number };

/** Method and authored review status retain separate captions. */
export function ProseHeadings({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      <g opacity={ramp(frame, 110, 4)}>
        <LabelSlots labels={[[input.copy.result, 52, 280, 856, 14, 2]]} />
      </g>
      <LabelSlots
        labels={[
          [input.copy.context, 52, 40, 856, 18, 2],
          [input.copy.source, 52, 96, 856, 14, 2],
          [methodMessages[input.method].message, 52, 552, 400, 14, 2],
          [reviewMessages[input.reviewState].message, 508, 552, 400, 14, 2],
        ]}
      />
    </g>
  );
}

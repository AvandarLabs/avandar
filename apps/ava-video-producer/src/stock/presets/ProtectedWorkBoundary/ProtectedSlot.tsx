import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ProtectedSlotBody } from "./ProtectedSlotBody";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  slot: Input["slots"][number];
  index: number;
  frame: number;
  input: Input;
  accent: string;
  id: string;
};
/** Equal unchanged schedule blocks retain kinds, names and work commitments. */
export function ProtectedSlot({
  slot,
  index,
  frame,
  input,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const width = 860 / input.slots.length,
    x = 50 + index * width;
  return (
    <g
      data-slot={slot.id}
      data-kind={slot.kind}
      data-commitment={slot.workLabel ?? ""}
      opacity={ramp(frame, 12, 26)}
    >
      <ProtectedSlotBody
        slot={slot}
        x={x}
        width={width}
        accent={accent}
        id={id}
      />
      {input.showSlotLabels ? (
        <g data-slot-label={slot.id}>
          <LabelSlots labels={[[slot.label, x + 8, 230, width - 16, 12, 5]]} />
        </g>
      ) : undefined}
      <LabelSlots
        labels={[[input.labels[slot.kind], x + 8, 310, width - 16, 12, 6]]}
      />
      {slot.workLabel !== null ? (
        <LabelSlots
          labels={[[slot.workLabel, x + 8, 425, width - 16, 12, 5]]}
        />
      ) : undefined}
    </g>
  );
}

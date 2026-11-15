import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ParcelMeasurements } from "./ParcelMeasurements";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";
/** Inputs for ParcelLedger. */
type Props = { input: Input };

/**
 * Separate parcel rows retain original names and any exhausted inset outcome.
 */
export function ParcelLedger({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.parcels.map((parcel, index) => (
        <g key={parcel.id}>
          <LabelSlots
            labels={[[parcel.label, 640, 162 + index * 140, 290, 12, 1]]}
          />
          <ParcelMeasurements parcel={parcel} index={index} input={input} />
        </g>
      ))}
    </g>
  );
}

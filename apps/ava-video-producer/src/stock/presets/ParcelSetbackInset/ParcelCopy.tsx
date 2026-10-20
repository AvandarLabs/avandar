import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";
/** Inputs for ParcelCopy. */
type Props = { input: Input };

/** Authored copy distinguishes geometric clearance from planning advice. */
export function ParcelCopy({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 36, 880, 18, 2],
          [input.copy.parcel, 40, 84, 290, 12, 3],
          [input.copy.envelope, 350, 84, 290, 12, 3],
          [input.copy.clearance, 660, 84, 290, 12, 3],
          [input.structure.label, 40, 490, 420, 12, 1],
          [String(input.setback), 660, 138, 280, 14, 1],
          [input.copy.unit, 40, 584, 880, 12, 1],
        ]}
      />
      {input.showDimensions ? (
        <LabelSlots
          labels={[
            [
              `${input.structure.width} × ${input.structure.height}`,
              40,
              520,
              500,
              12,
              2,
            ],
          ]}
        />
      ) : undefined}
    </g>
  );
}

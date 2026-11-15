import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";

type Props = { parcel: Input["parcels"][number]; index: number; input: Input };
/** Original and inset dimensions stay separate, with explicit empty results. */
export function ParcelMeasurements({
  parcel,
  index,
  input,
}: Readonly<Props>): ReactNode {
  const width = Math.max(0, parcel.width - 2 * input.setback);
  const height = Math.max(0, parcel.height - 2 * input.setback);
  const y = 162 + index * 140;
  return (
    <g>
      {input.showDimensions ? (
        <LabelSlots
          labels={[
            [`${parcel.width} × ${parcel.height}`, 640, y + 24, 290, 12, 2],
            [`${width} × ${height}`, 640, y + 58, 290, 12, 2],
          ]}
        />
      ) : undefined}
      {width === 0 || height === 0 ? (
        <LabelSlots labels={[[input.copy.empty, 640, y + 92, 290, 12, 3]]} />
      ) : undefined}
    </g>
  );
}

import { ramp } from "../../../motion";
import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { audienceMessages } from "./PublicationSnapshotSlice.controls";
import { SnapshotColumnHeading } from "./SnapshotColumnHeading";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Frozen snapshot metadata stays separate from the mutable source table. */
export function SnapshotHeadings({ input, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.table.columns.map((column, index) => (
        <SnapshotColumnHeading
          key={column.id}
          input={input}
          frame={frame}
          index={index}
        />
      ))}
      <g
        data-revision={input.publication.revision}
        data-audience={input.publication.audience}
        opacity={ramp(frame, 56, 39)}
      >
        <g opacity={ramp(frame, 95, 4)}>
          <LabelSlots
            labels={[[input.publication.label, 508, 153, 400, 14, 2]]}
          />
        </g>
        <LabelSlots
          labels={[
            [input.publication.revision, 508, 558, 400, 14, 2],
            [
              stockI18n._(audienceMessages[input.publication.audience]),
              508,
              596,
              400,
              12,
              1,
            ],
          ]}
        />
      </g>
    </g>
  );
}

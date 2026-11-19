import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { audienceMessages } from "./PublicationSnapshotSlice.controls";
import { SnapshotColumnHeading } from "./SnapshotColumnHeading";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Frozen snapshot metadata stays separate from the mutable source table. */
export function SnapshotHeadings({ input, frame }: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g>
      {input.table.columns.map((column, index) => {
        return (
          <SnapshotColumnHeading
            key={column.id}
            input={input}
            frame={frame}
            index={index}
          />
        );
      })}
      <g
        data-revision={input.publication.revision}
        data-audience={input.publication.audience}
        opacity={motion.ramp(frame, 56, motion.scale(39))}
      >
        <g opacity={motion.ramp(frame, 95, motion.press.duration)}>
          <LabelSlots
            labels={[[input.publication.label, 508, 153, 400, 14, 2]]}
          />
        </g>
        <LabelSlots
          labels={[
            [input.publication.revision, 508, 558, 400, 14, 2],
            [
              audienceMessages[input.publication.audience].message,
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

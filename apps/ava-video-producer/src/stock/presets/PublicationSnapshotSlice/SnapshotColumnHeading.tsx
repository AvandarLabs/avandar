import { mix } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; index: number };
/**
 * Source and reordered snapshot headings identify values throughout copying.
 */
export function SnapshotColumnHeading({
  input,
  frame,
  index,
}: Readonly<Props>): ReactNode {
  const column = input.table.columns[index],
    selectedIndex = input.selection.columnIds.indexOf(column.id);
  const sourceWidth = 400 / input.table.columns.length,
    destinationWidth = 400 / input.selection.columnIds.length;
  return (
    <g>
      {input.showExcludedCells || selectedIndex >= 0 ? (
        <LabelSlots
          labels={[
            [
              column.label,
              60 + index * sourceWidth,
              176,
              sourceWidth - 16,
              12,
              4,
            ],
          ]}
        />
      ) : undefined}
      {selectedIndex >= 0 ? (
        <SnapshotHeading
          label={column.label}
          x={516 + selectedIndex * destinationWidth}
          width={destinationWidth - 16}
          frame={frame}
        />
      ) : undefined}
    </g>
  );
}

/** The heading copied into the snapshot, settling onto its row. */
function SnapshotHeading({
  label,
  x,
  width,
  frame,
}: Readonly<{
  label: string;
  x: number;
  width: number;
  frame: number;
}>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g opacity={motion.ramp(frame, 56, motion.scale(1))}>
      <LabelSlots
        labels={[
          [
            label,
            x,
            mix(
              motion.ramp(frame, 92, motion.scale(3), motion.travel.easing),
              156,
              176,
            ),
            width,
            12,
            4,
          ],
        ]}
      />
    </g>
  );
}

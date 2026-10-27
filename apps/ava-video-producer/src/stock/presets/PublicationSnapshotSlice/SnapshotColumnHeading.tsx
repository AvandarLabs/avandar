import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
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
        <g opacity={ramp(frame, 56, 1)}>
          <LabelSlots
            labels={[
              [
                column.label,
                516 + selectedIndex * destinationWidth,
                mix(ramp(frame, 92, 3, EASE.inOut), 156, 176),
                destinationWidth - 16,
                12,
                4,
              ],
            ]}
          />
        </g>
      ) : undefined}
    </g>
  );
}

import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { getSnapshotCellFromFrame } from "./getSnapshotCellFromFrame";
import type { ReactNode } from "react";
type Props = {
  scene: ReturnType<typeof getSnapshotCellFromFrame>;
  frame: number;
};
/** Live edits receive their own visible write cue; snapshots keep old text. */
export function SnapshotCellText({ scene, frame }: Readonly<Props>): ReactNode {
  return (
    <g>
      <g
        opacity={
          scene.isEditTarget
            ? scene.isEdited
              ? ramp(frame, 117, 12)
              : 1 - ramp(frame, 96, 14)
            : 1
        }
      >
        <LabelSlots
          labels={[
            [scene.value, scene.x + 8, scene.y + 23, scene.width - 16, 12, 4],
          ]}
        />
      </g>
      {scene.isEdited ? (
        <path
          d={`M${scene.x + 5} ${scene.y + 66} h${(scene.width - 10) * ramp(frame, 117, 22)}`}
          stroke={STOCK.orange}
          strokeWidth={3}
        />
      ) : undefined}
    </g>
  );
}

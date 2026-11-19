import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getSnapshotCellFromFrame } from "./getSnapshotCellFromFrame";
import type { ReactNode } from "react";

type Props = {
  scene: ReturnType<typeof getSnapshotCellFromFrame>;
  frame: number;
};
/** Live edits receive their own visible write cue; snapshots keep old text. */
export function SnapshotCellText({ scene, frame }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <g
        opacity={
          scene.isEditTarget
            ? scene.isEdited
              ? motion.reveal(frame, 117)
              : 1 - motion.ramp(frame, 96, motion.scale(14))
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
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${scene.x + 5} ${scene.y + 66} h${(scene.width - 10) * motion.ramp(frame, 117, motion.scale(22))}`,
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      ) : undefined}
    </g>
  );
}

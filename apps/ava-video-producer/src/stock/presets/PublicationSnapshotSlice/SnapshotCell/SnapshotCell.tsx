import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getSnapshotCellFromFrame } from "../getSnapshotCellFromFrame";
import { SnapshotCellText } from "../SnapshotCellText";
import { SnapshotCellFrame } from "./SnapshotCellFrame";
import type { Input } from "../PublicationSnapshotSlice.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  rowIndex: number;
  columnIndex: number;
  snapshot: boolean;
};
/**
 * Selected cell copies carry pre-edit values into a distinct revision frame.
 */
export function SnapshotCell({
  input,
  frame,
  accent,
  rowIndex,
  columnIndex,
  snapshot,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scene = getSnapshotCellFromFrame({
    motion,
    input,
    frame,
    rowIndex,
    columnIndex,
    snapshot,
  });
  if (!scene.isVisible) {
    return undefined;
  }
  return (
    <g opacity={snapshot ? scene.copyOpacity : 1}>
      <SnapshotCellFrame
        scene={scene}
        snapshot={snapshot}
        frame={frame}
        diagonal={rowIndex + columnIndex}
        accent={accent}
      />
      <SnapshotCellText scene={scene} frame={frame} />
    </g>
  );
}

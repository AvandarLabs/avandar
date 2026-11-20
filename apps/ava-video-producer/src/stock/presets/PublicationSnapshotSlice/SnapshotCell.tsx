import { mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getSnapshotCellFromFrame } from "./getSnapshotCellFromFrame";
import { SnapshotCellText } from "./SnapshotCellText";
import type { Input } from "./PublicationSnapshotSlice.schema";
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
  const motion = useGraphicMotion();
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

type CellFrameProps = Readonly<{
  scene: ReturnType<typeof getSnapshotCellFromFrame>;
  snapshot: boolean;
  frame: number;
  diagonal: number;
  accent: string;
}>;

/**
 * The cell's frame, keyed as a live or snapshot copy. A selected cell's
 * outline thickens on its diagonal stagger.
 */
function SnapshotCellFrame({
  scene,
  snapshot,
  frame,
  diagonal,
  accent,
}: CellFrameProps): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const identity = `${scene.row.id}:${scene.column.id}`;
  return (
    <StockRect
      data-snapshot-cell={snapshot ? identity : undefined}
      data-live-cell={!snapshot ? identity : undefined}
      data-value={scene.value}
      data-row-id={scene.row.id}
      data-column-id={scene.column.id}
      x={scene.x}
      y={scene.y}
      width={scene.width}
      height={72}
      fill={tokens.color.surface}
      stroke={scene.selected ? accent : tokens.color.line}
      strokeWidth={scales.stroke(
        scene.selected
          ? mix(
              motion.ramp(
                frame,
                13 + diagonal * motion.stagger.list,
                motion.scale(22),
              ),
              tokens.stroke.hairline,
              tokens.stroke.default,
            )
          : tokens.stroke.hairline,
      )}
    />
  );
}

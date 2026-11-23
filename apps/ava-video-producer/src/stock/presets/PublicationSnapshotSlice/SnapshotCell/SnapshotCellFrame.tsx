import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type CellFrameProps as Props } from "./SnapshotCellShared.types";
import type { ReactNode } from "react";
/**
 * The cell's frame, keyed as a live or snapshot copy. A selected cell's
 * outline thickens on its diagonal stagger.
 */
export function SnapshotCellFrame({
  scene,
  snapshot,
  frame,
  diagonal,
  accent,
}: Props): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
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
          ? Motion.mix({
              t: motion.ramp(
                frame,
                13 + diagonal * motion.stagger.list,
                motion.scale(22),
              ),
              from: tokens.stroke.hairline,
              to: tokens.stroke.default,
            })
          : tokens.stroke.hairline,
      )}
    />
  );
}

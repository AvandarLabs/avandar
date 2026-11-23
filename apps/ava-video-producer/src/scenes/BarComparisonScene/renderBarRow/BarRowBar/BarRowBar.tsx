import { BarComparisonMotion } from "../../BarComparisonMotion/BarComparisonMotion";
import css from "./BarRowBar.module.css";
import type { Rect } from "../../../layout/SceneGeometry";
import type { RenderRowOptions as Options } from "../../BarComparisonScene.types";
import type { ReactNode } from "react";

/** Depth of the rough bar edge, in pixels. */
const ROUGH_EDGE_DEPTH = 10;
type Props = {
  rect: Rect;
  row: Options["row"];
  rowIndex: number;
  fraction: number;
  barEdge?: Options["barEdge"];
  barHeight: number;
  labelWidth: number;
  barWidth: number;
  center: number;
  scene: Options["theme"]["semantic"]["color"]["scene"];
  grow: number;
};
/** Renders bar row bar. */
export function BarRowBar({
  rect,
  row,
  rowIndex,
  fraction,
  barEdge,
  barHeight,
  labelWidth,
  barWidth,
  center,
  scene,
  grow,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.barRowBardiv1}
      style={{
        left: rect.x + labelWidth,
        top: center - barHeight / 2,
        width: Math.max(2, fraction * barWidth),
        height: barHeight,
        background: row.highlight ? scene.brand : scene.muted,
        clipPath:
          barEdge === "rough"
            ? BarComparisonMotion.getRoughEdgeClipPath({
                seed: rowIndex + 1,
                depth: ROUGH_EDGE_DEPTH,
              })
            : undefined,
        transform: `scaleX(${grow.toFixed(4)})`,
      }}
    />
  );
}

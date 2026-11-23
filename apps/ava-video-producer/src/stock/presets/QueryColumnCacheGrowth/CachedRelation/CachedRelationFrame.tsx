import { StockRect } from "../../../primitives/StockRect";
import type { useCachedRelationPresentation } from "./useCachedRelationPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useCachedRelationPresentation>,
  "scene" | "scales" | "style" | "color"
>;
/** Render the cached relation frame. */
export function CachedRelationFrame(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-cache-table="one"
      x={60}
      y={260}
      width={props.scene.width}
      height={74 + props.scene.rowCount * 44}
      rx={props.scales.corner(props.style.tableRadius)}
      fill={props.color.surface}
      stroke={props.color.line}
      strokeWidth={props.scales.stroke(props.style.tableStrokeWidth)}
    />
  );
}

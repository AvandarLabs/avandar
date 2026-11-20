import { StockRect } from "../primitives/StockRect/StockRect";
import {
  useGraphicFilter,
  useGraphicProps,
} from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A themed panel; `stroke`, `fill`, and `radius` are content overrides. */
export function Panel({
  x,
  y,
  width,
  height,
  children,
  stroke,
  fill,
  radius,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
  stroke?: string;
  fill?: string;
  radius?: number;
}): ReactNode {
  const panel = useGraphicProps("Panel", { stroke, fill, radius });
  const filter = useGraphicFilter("components.Panel.elevation");
  return (
    <g filter={filter}>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={panel.radius}
        fill={panel.fill}
        stroke={panel.stroke}
        strokeWidth={panel.strokeWidth}
      />
      {children}
    </g>
  );
}

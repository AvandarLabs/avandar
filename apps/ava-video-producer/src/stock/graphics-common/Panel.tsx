import { StockRect } from "../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: ReactNode;
  stroke?: string;
  fill?: string;
  radius?: number;
};
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
}: Readonly<Props>): ReactNode {
  const panel = GraphicThemeHooks.useGraphicProps("Panel", {
    stroke,
    fill,
    radius,
  });
  const filter = GraphicThemeHooks.useGraphicFilter(
    "components.Panel.elevation",
  );
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g filter={filter}>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={scales.corner(panel.radius)}
        fill={panel.fill}
        stroke={panel.stroke}
        strokeWidth={scales.stroke(panel.strokeWidth)}
      />
      {children}
    </g>
  );
}

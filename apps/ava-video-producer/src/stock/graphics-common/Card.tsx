import { StockRect } from "../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  children?: ReactNode;
};
/** A tinted summary card for labels that outgrow a pill. */
export function Card({
  x,
  y,
  width,
  height,
  color,
  children,
}: Readonly<Props>): ReactNode {
  const card = GraphicThemeHooks.useGraphicProps("Card", {});
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={scales.corner(card.radius)}
        fill={color}
        fillOpacity={scales.wash(card.fillAlpha)}
        stroke={color}
        strokeOpacity={card.strokeAlpha}
      />
      {children}
    </g>
  );
}

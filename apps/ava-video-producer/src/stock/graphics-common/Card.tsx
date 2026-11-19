import { StockRect } from "../primitives/StockRect/StockRect";
import { useGraphicProps } from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A tinted summary card for labels that outgrow a pill. */
export function Card({
  x,
  y,
  width,
  height,
  color,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  children?: ReactNode;
}): ReactNode {
  const card = useGraphicProps("Card", {});
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={card.radius}
        fill={color}
        fillOpacity={card.fillAlpha}
        stroke={color}
        strokeOpacity={card.strokeAlpha}
      />
      {children}
    </g>
  );
}

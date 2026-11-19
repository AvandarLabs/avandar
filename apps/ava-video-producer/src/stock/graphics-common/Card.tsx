import { StockRect } from "../primitives/StockRect/StockRect";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../theme/useGraphicTheme/useGraphicTheme";
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
  const { stroke } = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
        strokeWidth={scales.stroke(stroke.hairline)}
      />
      {children}
    </g>
  );
}

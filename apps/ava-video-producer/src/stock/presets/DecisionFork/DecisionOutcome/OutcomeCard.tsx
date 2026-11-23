import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  fill: string;
  stroke: string;
  strokeOpacity?: number;
};
/** The outcome card's outline, drawn once plain and once in the accent. */
export function OutcomeCard({
  x,
  fill,
  stroke,
  strokeOpacity,
}: Readonly<Props>): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps({
    name: "DecisionFork",
    props: {},
  });
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      x={x - 104}
      y={424}
      width={208}
      height={94}
      rx={scales.corner(style.outcomeRadius)}
      fill={fill}
      stroke={stroke}
      strokeOpacity={strokeOpacity}
      strokeWidth={scales.stroke(style.outcomeStrokeWidth)}
    />
  );
}

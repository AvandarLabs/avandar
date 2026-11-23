import { StockRect } from "../primitives/StockRect";
import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Text } from "./Text";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
};
/** A themed pill-shaped tag in the caller's colour and width. */
export function Pill({ x, y, text, color, width }: Readonly<Props>): ReactNode {
  const pill = GraphicThemeHooks.useGraphicProps({
    name: "Pill",
    props: {},
  });
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={x}
        y={y}
        width={width}
        height={pill.height}
        rx={scales.corner(Math.min(pill.radius, pill.height / 2))}
        fill={color}
        fillOpacity={scales.wash(pill.fillAlpha)}
        stroke={color}
        strokeOpacity={pill.strokeAlpha}
      />
      <Text
        role="pill"
        x={x + width / 2}
        y={y + pill.textBaseline}
        fill={color}
        anchor="middle"
      >
        {text}
      </Text>
    </g>
  );
}

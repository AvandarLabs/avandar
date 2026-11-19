import { StockRect } from "../primitives/StockRect/StockRect";
import {
  useGraphicProps,
  useGraphicShapeScales,
} from "../theme/useGraphicTheme/useGraphicTheme";
import { Text } from "./Text";
import type { ReactNode } from "react";

/** A themed pill-shaped tag in the caller's colour and width. */
export function Pill({
  x,
  y,
  text,
  color,
  width,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  width: number;
}): ReactNode {
  const pill = useGraphicProps("Pill", {});
  const scales = useGraphicShapeScales();
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

import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  stroke: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>["stroke"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  shapes: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  category: "missing" | "low" | "high";
  x: number;
  y: number;
  color: string;
};

/** Renders the zone surface in authored paint order. */
export function ZoneSurface(options: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={options.x}
      y={options.y}
      width={136}
      height={140}
      fill={options.color}
      fillOpacity={
        options.category === "high"
          ? options.atomic.opacity["45"]
          : options.atomic.opacity["15"]
      }
      stroke={options.color}
      strokeDasharray={
        options.category === "missing"
          ? options.atomic.dash.medium.join(" ")
          : undefined
      }
      strokeWidth={options.shapes.stroke(options.stroke.hairline)}
    />
  );
}

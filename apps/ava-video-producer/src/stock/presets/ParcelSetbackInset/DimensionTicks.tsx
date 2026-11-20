import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  width: number;
  height: number;
  marker: string;
  side?: "outside" | "inside";
};
/** Dimension witness ticks follow the complete rectangle they measure. */
export function DimensionTicks({
  x,
  y,
  width,
  height,
  marker,
  side = "outside",
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const offset = side === "outside" ? -9 : 3;
  return (
    <g data-dimension-ticks={marker}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y + offset - 4} v8 M${x + width} ${y + offset - 4} v8 M${x} ${y + offset} H${x + width} M${x + offset - 4} ${y} h8 M${x + offset - 4} ${y + height} h8 M${x + offset} ${y} V${y + height}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(0.8)}
      />
    </g>
  );
}

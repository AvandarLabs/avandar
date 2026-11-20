import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = Readonly<{ x: number; accent: string }>;
/** The three empty slots along the bottom of the destination panel. */
export function DestinationSlots({ x, accent }: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("SourceMerge", {});
  const { sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return [0, 1, 2].map((slot) => {
    return (
      <g key={slot}>
        <StockRect
          x={x + 33 + slot * 59}
          y={361}
          width={45}
          height={26}
          rx={shapes.corner(style.slotRadius)}
          fill={accent}
          fillOpacity={shapes.wash(style.slotFillAlpha)}
        />
        <SketchedShape
          shape={{ kind: "path", d: `M${x + 44 + slot * 59} 374 h23` }}
          profile={sketch.shape}
          stroke={accent}
          strokeOpacity={style.slotStrokeAlpha}
          strokeWidth={shapes.stroke(style.slotStrokeWidth)}
        />
      </g>
    );
  });
}

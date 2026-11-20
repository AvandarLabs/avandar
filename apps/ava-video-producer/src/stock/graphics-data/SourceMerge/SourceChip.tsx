import { Text } from "../../graphics-common/Text";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { SourceMergeInput } from "../../presets/SourceMerge/SourceMerge.schema";
import type { ReactNode } from "react";

type Source = SourceMergeInput["sources"][number];
type Props = Readonly<{ source: Source; x: number; y: number; color: string }>;
/** The source's kind badge inside its row panel. */
export function SourceChip({ source, x, y, color }: Props): ReactNode {
  const style = GraphicThemeHooks.useGraphicProps("SourceMerge", {});
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <StockRect
        x={x + 17}
        y={y + 20}
        width={46}
        height={46}
        rx={shapes.corner(style.chipRadius)}
        fill={color}
        fillOpacity={shapes.wash(style.chipFillAlpha)}
        stroke={color}
        strokeOpacity={style.chipStrokeAlpha}
        strokeWidth={shapes.stroke(style.chipStrokeWidth)}
      />
      <Text role="pill" x={x + 40} y={y + 49} fill={color} anchor="middle">
        {source.kind}
      </Text>
    </>
  );
}

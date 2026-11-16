import { Text } from "../../graphics-common/Text";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicProps } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { SourceMergeInput } from "../../presets/SourceMerge/SourceMerge.schema";

type Source = SourceMergeInput["sources"][number];

type Props = Readonly<{ source: Source; x: number; y: number; color: string }>;

/** The source's kind badge inside its row panel. */
export function SourceChip({ source, x, y, color }: Props) {
  const style = useGraphicProps("SourceMerge", {});
  return (
    <>
      <StockRect
        x={x + 17}
        y={y + 20}
        width={46}
        height={46}
        rx={style.chipRadius}
        fill={color}
        fillOpacity={style.chipFillAlpha}
        stroke={color}
        strokeOpacity={style.chipStrokeAlpha}
        strokeWidth={style.chipStrokeWidth}
      />
      <Text role="pill" x={x + 40} y={y + 49} fill={color} anchor="middle">
        {source.kind}
      </Text>
    </>
  );
}

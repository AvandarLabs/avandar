import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicProps } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = Readonly<{ x: number; accent: string }>;

/** The three empty slots along the bottom of the destination panel. */
export function DestinationSlots({ x, accent }: Props): ReactNode {
  const style = useGraphicProps("SourceMerge", {});
  return [0, 1, 2].map((slot) => {
    return (
      <g key={slot}>
        <StockRect
          x={x + 33 + slot * 59}
          y={361}
          width={45}
          height={26}
          rx={style.slotRadius}
          fill={accent}
          fillOpacity={style.slotFillAlpha}
        />
        <path
          d={`M${x + 44 + slot * 59} 374 h23`}
          stroke={accent}
          strokeOpacity={style.slotStrokeAlpha}
          strokeWidth={style.slotStrokeWidth}
        />
      </g>
    );
  });
}

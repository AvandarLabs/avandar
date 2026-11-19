import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  id: string;
  x: number;
  y: number;
  expansion: number;
  accent: string;
  isLater: boolean;
};
/** Persistent row body with a distinct later-generation edge. */
export function EvolutionRowBackdrop({
  id,
  x,
  y,
  expansion,
  accent,
  isLater,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-record-body={id}
        x={x}
        y={y}
        width={520 + 260 * expansion}
        height={60}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={isLater ? accent : tokens.color.line}
      />
      {isLater ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${x - 8} ${y + 8} V${y + 52}` }}
          profile={tokens.sketch.shape}
          data-later-notch=""
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      ) : null}
    </g>
  );
}

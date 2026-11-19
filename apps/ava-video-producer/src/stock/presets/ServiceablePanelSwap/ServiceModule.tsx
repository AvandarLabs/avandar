import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  module: { id: string; label: string };
  x: number;
  y: number;
  isReplacement?: boolean;
  isRemoved?: boolean;
  accent: string;
};
/**
 * A complete module keeps its original identity and readable label in transit.
 */
export function ServiceModule({
  module,
  x,
  y,
  isReplacement = false,
  isRemoved = false,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-module={isReplacement ? undefined : module.id}
        data-replacement={isReplacement ? module.id : undefined}
        data-removed-original={isRemoved ? module.id : undefined}
        x={x}
        y={y}
        width={136}
        height={128}
        rx={scales.corner(6)}
        fill={tokens.color.surface}
        stroke={isReplacement ? accent : tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <LabelSlots labels={[[module.label, x + 10, y + 24, 116, 14, 5]]} />
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 60} ${y} v-8 h16 v8` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}

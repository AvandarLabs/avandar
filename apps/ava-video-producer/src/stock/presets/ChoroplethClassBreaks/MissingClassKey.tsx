import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { text: string; y: number };
/**
 * The missing key uses the same muted fill and dashed stroke as a null tile.
 */
export function MissingClassKey({ text, y }: Readonly<Props>): ReactNode {
  const { color, stroke } = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-missing-class-key="true"
        x={554}
        y={y - 11}
        width={14}
        height={14}
        fill={color.inactive}
        fillOpacity={atomic.opacity["15"]}
        stroke={color.inactive}
        strokeDasharray={atomic.dash.medium.join(" ")}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <LabelSlots labels={[[text, 578, y, 322, 12, 2]]} />
    </g>
  );
}

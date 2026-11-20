import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ChoroplethClassBreaks.schema";
import type { ReactNode } from "react";

type Props = {
  scheme: Input["schemes"][number];
  offset: number;
  unitLabel: string;
};
/** The full scheme name and common unit stay inside their own legend panel. */
export function ClassLegendHeading({
  scheme,
  offset,
  unitLabel,
}: Readonly<Props>): ReactNode {
  const { color, stroke, corner } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={542}
        y={130 + offset}
        width={370}
        height={216}
        rx={shapes.corner(corner.cell)}
        fill={color.surface}
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <LabelSlots
        labels={[
          [scheme.label, 554, 151 + offset, 346, 14, 3],
          [unitLabel, 554, 208 + offset, 346, 12, 2],
        ]}
      />
    </g>
  );
}

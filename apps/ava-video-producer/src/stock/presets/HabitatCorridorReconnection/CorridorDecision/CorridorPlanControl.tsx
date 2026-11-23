import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  handX: number;
};

/** Renders the corridor plan control in authored paint order. */
export function CorridorPlanControl(options: Readonly<Props>): ReactNode {
  return (
    <>
      <PersonGlyph
        x={439}
        y={101}
        size={32}
        role="worker"
        color={options.tokens.color.highlight}
      />
      <StockRect
        data-plan-control="true"
        x={472}
        y={95}
        width={16}
        height={16}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.highlight}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M 445 101 L ${options.handX} 103` }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.highlight}
        strokeWidth={options.scales.stroke(2.5)}
        fill="none"
      />
    </>
  );
}

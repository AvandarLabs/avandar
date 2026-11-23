import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { accent: string };

/** The shelf, the retailer behind it, and the shopper's basket. */
export function MarketScenery({ accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M40 288 H922 M40 288 V304 M922 288 V304" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
      <PersonGlyph
        x={790}
        y={414}
        size={52}
        role="worker"
        color={tokens.color.accentAlt}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M285 399 L300 465 H553 L568 399 M302 399 Q426 320 550 399",
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
    </>
  );
}

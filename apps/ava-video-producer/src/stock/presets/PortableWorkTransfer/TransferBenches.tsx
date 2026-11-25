import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The source bench and the destination bench the owner carries between. */
export function TransferBenches(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M36 550 H310 M45 550 v12 M300 550 v12" }}
        profile={tokens.sketch.shape}
        data-source-bench="true"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M330 550 H920 M340 550 v12 M910 550 v12" }}
        profile={tokens.sketch.shape}
        data-destination-bench="true"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
    </>
  );
}

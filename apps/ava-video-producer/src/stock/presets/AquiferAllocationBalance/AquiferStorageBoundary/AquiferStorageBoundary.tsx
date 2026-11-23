import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the outline content with authored geometry. */
export function AquiferStorageBoundary({
  tokens,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{ kind: "path", d: "M 300 230 V 380 H 700 V 230" }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.default)}
      fill="none"
    />
  );
}

import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the outline with authored geometry. */
export function AquiferReservoirBoundary({
  tokens,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: "M 280 222 Q 380 202 480 222 T 720 222 V 397 H 280 Z",
      }}
      profile={tokens.sketch.shape}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}

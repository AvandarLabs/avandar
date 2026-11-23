import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { index: number; accent: string };

/** One writing stroke standing in for a response line. */
export function ResponseStroke({ index, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M214 ${378 + index * 34} h${490 - index * 32}`,
      }}
      profile={tokens.sketch.shape}
      data-response-stroke={index}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}

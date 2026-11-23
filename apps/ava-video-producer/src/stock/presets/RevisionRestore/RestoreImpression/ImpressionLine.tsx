import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { d: string; accent: string };

/** One line of the snapshot's content, carried on the impression. */
export function ImpressionLine({ d, accent }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d }}
      profile={tokens.sketch.shape}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      strokeOpacity={atomic.opacity["70"]}
    />
  );
}

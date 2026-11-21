import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { d: string };

/** An open-topped container's outline. */
export function OpenContainer({ d }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}

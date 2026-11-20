import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The hand placing a correction token into its position. */
export function CorrectionHand({
  paymentId,
  x,
  y,
}: Readonly<{ paymentId: string; x: number; y: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M740 160 H950 V${y - 18} L${x} ${y - 18}` }}
      profile={tokens.sketch.shape}
      data-correction-hand={paymentId}
      fill="none"
      stroke={tokens.color.accentAlt}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}

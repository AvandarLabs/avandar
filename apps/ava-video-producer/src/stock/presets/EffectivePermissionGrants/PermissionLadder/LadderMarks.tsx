import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = {
  requiredRole: Input["requiredRole"];
  requiredY: number;
  resultY: number;
  accent: string;
};
/** The fixed notch at the required rank and the rising result marker. */
export function LadderMarks({
  requiredRole,
  requiredY,
  resultY,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <g data-required-notch={requiredRole}>
        <SketchedShape
          shape={{ kind: "path", d: `M725 ${requiredY - 10} v20 l16 -10 Z` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          fill={tokens.color.highlight}
        />
      </g>
      <g data-result-marker="true">
        <SketchedShape
          shape={{ kind: "circle", cx: 790, cy: resultY, r: 14 }}
          profile={tokens.sketch.shape}
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          fill={tokens.color.ground}
        />
      </g>
    </>
  );
}

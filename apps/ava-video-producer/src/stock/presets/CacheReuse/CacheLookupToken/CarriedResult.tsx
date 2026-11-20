import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CacheLookupTokenShared } from "./CacheLookupTokenShared/CacheLookupTokenShared";
import { type Props } from "./CacheLookupTokenShared/CacheLookupTokenShared.types";
import type { ReactNode } from "react";
/** The result impression a returning key carries, fading in and out. */
export function CarriedResult({
  x,
  y,
  frame,
  input,
}: Readonly<Omit<Props, "accent">>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-carried-result={input.result.value} aria-label={input.result.label}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 14} ${y - 12} h20 v24 h-20 Z M${x + 18} ${y - 5} h12 M${x + 18} ${y + 1} h12 M${x + 18} ${y + 7} h8`,
        }}
        profile={tokens.sketch.shape}
        opacity={CacheLookupTokenShared.getResultOpacity({ frame, motion })}
        fill={tokens.color.surface}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
    </g>
  );
}

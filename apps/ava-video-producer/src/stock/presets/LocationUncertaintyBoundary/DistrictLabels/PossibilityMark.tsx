import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A tick for a possible district, a dash for one ruled out. */
export function PossibilityMark({
  districtId,
  index,
  isPossible,
}: Readonly<{
  districtId: string;
  index: number;
  isPossible: boolean;
}>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: isPossible
          ? `M918 ${124 + index * 40}l4 4 8-10`
          : `M918 ${124 + index * 40}h12`,
      }}
      profile={tokens.sketch.shape}
      data-possibility={districtId}
      data-is-possible={isPossible}
      fill="none"
      stroke={isPossible ? tokens.color.positive : tokens.color.inactive}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}

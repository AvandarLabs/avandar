import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ContributionWeave.schema";
import type { ReactNode } from "react";

type Props = {
  id: string;
  color: string;
  pattern: Input["warp"][number]["pattern"];
};

/** Bounded authored marks identify bands without implying contribution size. */
export function WeaveBandPattern({
  id,
  color,
  pattern,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse">
      <rect width={12} height={12} fill={color} />
      {pattern === "stripe" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M0 3 H12 M0 9 H12" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.ground}
          strokeOpacity={atomic.opacity["45"]}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        />
      ) : pattern === "dot" ? (
        <circle
          cx={6}
          cy={6}
          r={2}
          fill={tokens.color.ground}
          fillOpacity={atomic.opacity["50"]}
        />
      ) : undefined}
    </pattern>
  );
}

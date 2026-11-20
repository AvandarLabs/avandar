import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; progress: number; accent: string };
/** Approach Trace for the authored scene. */
export function ApproachTrace({
  input,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return input.showApproachTrace ? (
    <SketchedShape
      shape={{ kind: "path", d: "M160 250 V490 H605" }}
      profile={tokens.sketch.shape}
      data-approach-trace="true"
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
      strokeDasharray={atomic.dash.boundary.join(" ")}
      opacity={progress * tokens.alpha.guide}
    />
  ) : undefined;
}

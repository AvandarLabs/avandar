import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";
/** The companion's arm, alongside the learner or behind on the last step. */
export function SupportGesture({
  support,
  companionX,
  finalStep,
}: Readonly<{
  support: Input["finalStepSupport"];
  companionX: number;
  finalStep: number;
}>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-support-gesture={support}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${companionX} 390 L${companionX + mix(finalStep, 20, support === "alongside" ? 40 : 12)} ${mix(finalStep, 398, support === "alongside" ? 385 : 405)}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
    </g>
  );
}

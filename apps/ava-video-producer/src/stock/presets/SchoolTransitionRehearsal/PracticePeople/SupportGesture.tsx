import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchoolTransitionRehearsal.schema";
import type { ReactNode } from "react";

type Props = {
  support: Input["finalStepSupport"];
  companionX: number;
  finalStep: number;
};
/** The companion's arm, alongside the learner or behind on the last step. */
export function SupportGesture({
  support,
  companionX,
  finalStep,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-support-gesture={support}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${companionX} 390 L${
            companionX +
            Motion.mix({
              t: finalStep,
              from: 20,
              to: support === "alongside" ? 40 : 12,
            })
          } ${Motion.mix({
            t: finalStep,
            from: 398,
            to: support === "alongside" ? 385 : 405,
          })}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
    </g>
  );
}

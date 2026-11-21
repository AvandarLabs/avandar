import { Motion } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DispatchButton } from "./DispatchButton/DispatchButton";
import { DispatchDecisionLabels } from "./DispatchDecisionLabels/DispatchDecisionLabels";
import type { Input } from "./BatteryDispatchBalance.schema";
import type { ReactNode } from "react";

/** Inputs for DispatchOperator. */
type Props = {
  frame: number;
  accent: string;
  input: Input;
};
/**
 * The operator reaches and presses the dispatch cue before stored energy exits.
 */
export function DispatchOperator({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const reach = motion.ramp(frame, 68, motion.whip, motion.travel.easing);
  const handX = Motion.mix({ t: reach, from: 449, to: 480 });
  const handY = Motion.mix({ t: reach, from: 111, to: 105 });
  return (
    <g>
      <DispatchDecisionLabels input={input} />
      <PersonGlyph
        x={439}
        y={106}
        size={32}
        role="worker"
        color={tokens.color.accentAlt}
      />
      <DispatchButton {...{ accent, atomic, reach }} />
      <SketchedShape
        shape={{ kind: "path", d: `M 445 106 L ${handX} ${handY}` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(2.5)}
        fill="none"
      />
      <circle
        data-dispatch-hand="true"
        cx={handX}
        cy={handY}
        r={3}
        fill={tokens.color.accentAlt}
      />
    </g>
  );
}

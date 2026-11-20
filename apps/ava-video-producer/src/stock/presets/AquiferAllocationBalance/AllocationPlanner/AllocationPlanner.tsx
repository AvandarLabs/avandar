import { mix } from "../../../../motion";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PlannerHand } from "./PlannerHand";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "../AquiferAllocationBalance.schema";
import type { ReactNode } from "react";
/** Inputs for AllocationPlanner. */
type Props = { frame: number; accent: string; input: Input };
/**
 * The planner takes hold of the approval control and sets the supplied amount.
 */
export function AllocationPlanner({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { knobX, handX } = _getPlannerReach({ frame, input, motion });
  return (
    <g>
      <PersonGlyph
        x={180}
        y={181}
        size={34}
        role="worker"
        color={tokens.color.highlight}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M 220 185 H 320" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <circle
        data-approval-knob="true"
        cx={knobX}
        cy={185}
        r={7}
        fill={accent}
      />
      <PlannerHand handX={handX} />
    </g>
  );
}
/** Where the approval knob is set and how far the planner's hand reaches. */
function _getPlannerReach({
  frame,
  input,
  motion,
}: Readonly<{ frame: number; input: Input; motion: VideoMotion }>) {
  const reach = motion.ramp(frame, 28, motion.whip, motion.travel.easing),
    set = motion.ramp(frame, 36, motion.scale(14), motion.travel.easing);
  const share = input.flows.requestedWithdrawalM3
    ? input.flows.approvedWithdrawalM3 / input.flows.requestedWithdrawalM3
    : 0;
  const knobX = 220 + 100 * share * set;
  return { knobX, handX: mix(reach, 190, knobX) };
}

import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CorridorPlanControl } from "./CorridorPlanControl";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

/** Inputs for CorridorDecision. */
type Props = {
  frame: number;
  input: Input;
};

/**
 * A management cue opens the authored footprint without changing its supplied
 * stage.
 */
export function CorridorDecision({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const reach = motion.ramp(frame, 28, motion.whip, motion.travel.easing),
    handX = Motion.mix({
      t: reach,
      from: 449,
      to: 480,
    });
  return (
    <g>
      <FitText
        text={input.decision.actorLabel}
        x={32}
        y={90}
        width={360}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.decision.actionLabel}
        x={550}
        y={90}
        width={378}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <CorridorPlanControl tokens={tokens} scales={scales} handX={handX} />
      <circle
        data-plan-hand="true"
        cx={handX}
        cy={103}
        r={3}
        fill={tokens.color.highlight}
      />
    </g>
  );
}

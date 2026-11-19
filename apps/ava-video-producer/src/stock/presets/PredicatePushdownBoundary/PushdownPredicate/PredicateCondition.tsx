import { ramp } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

const CONDITION_FADE_FRAMES = 12;

type Props = Readonly<{ frame: number; cue: number; label: string }>;

/**
 * The condition label that fades in beside the badge once the gates start
 * closing.
 */
export function PredicateCondition({ frame, cue, label }: Props): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g opacity={ramp(frame, cue, motion.scale(CONDITION_FADE_FRAMES))}>
      <LabelSlots labels={[[label, 516, 109, 396, 12, 2]]} />
    </g>
  );
}

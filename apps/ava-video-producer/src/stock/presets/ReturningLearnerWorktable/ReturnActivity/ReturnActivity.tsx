import { propEq } from "@avandar/utils";
import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReturnActivityActivityId } from "./ReturnActivityActivityId";
import type { Input } from "../ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = {
  activity: Input["returnActivities"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

/**
 * Teacher-placed new work or an explicit link to a retained original sample.
 */
export function ReturnActivity({
  activity,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = motion.ramp(
    frame,
    94 + index * motion.scaleStagger(16),
    motion.scale(12),
    motion.travel.easing,
  );
  const x = Motion.mix({
    t: progress,
    from: 650,
    to: 300 + index * 110,
  });
  const priorIndex = input.priorWork.findIndex(
    propEq("id", activity.priorWorkId),
  );
  const visible = frame >= 94 + index * motion.scaleStagger(16);
  return (
    <ReturnActivityActivityId
      activity={activity}
      index={index}
      input={input}
      accent={accent}
      atomic={atomic}
      tokens={tokens}
      progress={progress}
      x={x}
      priorIndex={priorIndex}
      visible={visible}
    />
  );
}

import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ActivityPaper } from "./ActivityPaper";
import { ReturnActivityLabels } from "./ReturnActivityLabels";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

/** The dash linking an activity back to the prior work it resumes. */
const PRIOR_LINK_DASH = "3 4";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const progress = motion.ramp(
    frame,
    94 + index * 16,
    motion.scale(12),
    motion.travel.easing,
  );
  const x = mix(progress, 650, 300 + index * 110);
  const priorIndex = input.priorWork.findIndex(
    propEq("id", activity.priorWorkId),
  );
  const visible = frame >= 94 + index * 16;
  return (
    <g data-activity-id={activity.id} opacity={visible ? 1 : 0}>
      {activity.kind === "review" && progress === 1 ? (
        <g data-review-target={activity.priorWorkId}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${x} 342 V${318 + index * 5} H${280 + priorIndex * 50} V288`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.accentAlt}
            strokeDasharray={PRIOR_LINK_DASH}
          />
        </g>
      ) : undefined}
      <ActivityPaper activity={activity} index={index} x={x} accent={accent} />
      {progress === 1 ? (
        <ReturnActivityLabels activity={activity} input={input} index={index} />
      ) : undefined}
    </g>
  );
}

import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ActivityPaper } from "./ActivityPaper";
import { ReturnActivityLabels } from "./ReturnActivityLabels";
import type { Input } from "./ReturningLearnerWorktable.schema";
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
  const progress = ramp(frame, 94 + index * 16, 12, EASE.inOut);
  const x = mix(progress, 650, 300 + index * 110);
  const priorIndex = input.priorWork.findIndex(
    propEq("id", activity.priorWorkId),
  );
  const visible = frame >= 94 + index * 16;
  return (
    <g data-activity-id={activity.id} opacity={visible ? 1 : 0}>
      {activity.kind === "review" && progress === 1 ? (
        <path
          data-review-target={activity.priorWorkId}
          d={`M${x} 342 V${318 + index * 5} H${280 + priorIndex * 50} V288`}
          fill="none"
          stroke={STOCK.cyan}
          strokeDasharray="3 4"
        />
      ) : undefined}
      <ActivityPaper activity={activity} index={index} x={x} accent={accent} />
      {progress === 1 ? (
        <ReturnActivityLabels activity={activity} input={input} index={index} />
      ) : undefined}
    </g>
  );
}

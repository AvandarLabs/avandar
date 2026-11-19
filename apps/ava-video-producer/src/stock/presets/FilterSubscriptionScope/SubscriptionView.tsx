import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getExclusionFromFrame } from "./getExclusionFromFrame";
import { SubscriptionFrame } from "./SubscriptionFrame";
import { SubscriptionRecord } from "./SubscriptionRecord";
import type { Input } from "./FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = {
  view: Input["views"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

/** Frames between neighbouring views appearing. */
const VIEW_STAGGER_FRAMES = 3;
/** Frames a view takes to fade in. */
const VIEW_FRAMES = 25;
/** One view retains the common denominator unless it subscribes. */
export function SubscriptionView({
  view,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const x = 48 + index * (864 / input.views.length),
    width = 864 / input.views.length - 18;
  const progress = getExclusionFromFrame(frame, motion);
  const rows =
    view.subscribed && progress === 1
      ? input.records.filter(propEq("category", input.selectedCategory))
      : input.records;
  const sum = rows.reduce((total, record) => {
    return total + record.value;
  }, 0);
  return (
    <g
      data-view={view.id}
      data-count={rows.length}
      data-sum={sum}
      data-value-unit={input.metric.valueUnit}
      data-count-unit={input.metric.countUnit}
      opacity={ramp(
        frame,
        13 + index * motion.scale(VIEW_STAGGER_FRAMES),
        motion.scale(VIEW_FRAMES),
        motion.reveal.easing,
      )}
    >
      <SubscriptionFrame {...{ view, x, width, accent }} />
      {input.records.map((record, rowIndex) => {
        return (
          <SubscriptionRecord
            key={record.id}
            {...{ record, rowIndex, x, width, view, input, frame, accent }}
          />
        );
      })}
      <LabelSlots
        labels={[
          [`${sum} ${input.metric.valueUnit}`, x + 12, 506, width - 24, 12, 3],
          [
            `${rows.length} ${input.metric.countUnit}`,
            x + 12,
            560,
            width - 24,
            12,
            3,
          ],
        ]}
      />
    </g>
  );
}

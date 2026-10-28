import { propEq } from "@avandar/utils";
import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
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
/** One view retains the common denominator unless it subscribes. */
export function SubscriptionView({
  view,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const x = 48 + index * (864 / input.views.length),
    width = 864 / input.views.length - 18;
  const progress = ramp(frame, 91, 48);
  const rows =
    view.subscribed && progress === 1
      ? input.records.filter(propEq("category", input.selectedCategory))
      : input.records;
  const sum = rows.reduce((total, record) => total + record.value, 0);
  return (
    <g
      data-view={view.id}
      data-count={rows.length}
      data-sum={sum}
      data-value-unit={input.metric.valueUnit}
      data-count-unit={input.metric.countUnit}
      opacity={ramp(frame, 13 + index * 3, 25)}
    >
      <SubscriptionFrame {...{ view, x, width, accent }} />
      {input.records.map((record, rowIndex) => (
        <SubscriptionRecord
          key={record.id}
          {...{ record, rowIndex, x, width, view, input, frame, accent }}
        />
      ))}
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

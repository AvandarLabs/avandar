import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SubscriptionSocket } from "./SubscriptionSocket";
import { SubscriptionView } from "./SubscriptionView";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./FilterSubscriptionScope.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/** A shared category socket reaches only explicitly subscribed views. */
export function FilterSubscriptionScope({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 0, 12)}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.source, 48, 53, 404, 12, 3],
          [input.copy.result, 516, 53, 396, 12, 3],
          [input.metric.valueLabel, 636, 112, 276, 12, 3],
        ]}
      />
      <SubscriptionSocket {...{ frame, input, accent }} />
      {input.views.map((view, index) => (
        <SubscriptionView
          key={view.id}
          {...{ view, index, input, frame, accent }}
        />
      ))}
    </g>
  );
}

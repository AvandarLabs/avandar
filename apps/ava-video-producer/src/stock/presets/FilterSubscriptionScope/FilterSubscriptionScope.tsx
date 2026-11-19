import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { SubscriptionSocket } from "./SubscriptionSocket";
import { SubscriptionView } from "./SubscriptionView";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** A shared category socket reaches only explicitly subscribed views. */
export function FilterSubscriptionScope({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, 0)}>
      <LabelSlots
        labels={[
          [input.copy.context, 48, 28, 864, 14, 1],
          [input.copy.source, 48, 53, 404, 12, 3],
          [input.copy.result, 516, 53, 396, 12, 3],
          [input.metric.valueLabel, 636, 112, 276, 12, 3],
        ]}
      />
      <SubscriptionSocket {...{ frame, input, accent }} />
      {input.views.map((view, index) => {
        return (
          <SubscriptionView
            key={view.id}
            {...{ view, index, input, frame, accent }}
          />
        );
      })}
    </g>
  );
}

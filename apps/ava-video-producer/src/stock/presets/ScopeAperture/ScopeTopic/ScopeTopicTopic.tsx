import { ScopeTopicCopy } from "../ScopeTopicCopy";
import type { Input } from "../ScopeAperture.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  accent: string;
  topic: Input["topics"][number];
  index: number;
  membershipIndex: number;
  showExcluded: boolean;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  topic: Readonly<ParentProps>["topic"];
  showExcluded: Readonly<ParentProps>["showExcluded"];
  x: number;
  y: number;
  opacity: number;
};

/** Renders the scope topic topic in authored paint order. */
export function ScopeTopicTopic(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-topic={options.topic.id}
      data-topic-position={options.topic.id}
      data-x={options.x}
      data-y={options.y}
      transform={`translate(${options.x} ${options.y})`}
      opacity={options.opacity}
      aria-hidden={
        !options.topic.included && !options.showExcluded && options.frame >= 120
      }
    >
      <ScopeTopicCopy {...{ topic: options.topic, accent: options.accent }} />
    </g>
  );
}

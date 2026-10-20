import { propEq } from "@avandar/utils";
import { ScopeBoundary } from "./ScopeBoundary";
import { ScopeTopic } from "./ScopeTopic";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ScopeAperture.schema";
import type { ReactNode } from "react";
/** Complete authored scope and membership. */
export type Props = GraphicProps & { input: Input };
/** A contracting semantic boundary selects the supplied included topics. */
export function ScopeAperture({
  input,
  frame,
  accent,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ScopeBoundary {...{ ...remainingProps, input, frame, accent }} />
      {input.topics.map((topic, index) => (
        <ScopeTopic
          key={topic.id}
          {...{ topic, index, frame, accent }}
          membershipIndex={
            input.topics
              .slice(0, index)
              .filter(propEq("included", topic.included)).length
          }
          showExcluded={input.showExcludedTopics}
        />
      ))}
    </g>
  );
}

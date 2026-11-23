import { propEq } from "@avandar/utils";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { ExpertiseRoleExchange } from "../ExpertiseRoleExchange";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof ExpertiseRoleExchange>[0]["input"];
};

/** Renders the topic attribution with authored geometry. */
export function ExpertiseRoleExchangeTopicAttribution({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.topics.map((item, index) => {
        return (
          <g key={item.id} data-topic-attribution={item.id}>
            <LabelSlots
              labels={[
                [item.label, 60, 445 + index * 65, 270, 14, 3],
                [
                  input.people.find(propEq("id", item.expertId))!.label,
                  390,
                  445 + index * 65,
                  210,
                  14,
                  3,
                ],
                [input.labels.demonstrates, 650, 445 + index * 65, 250, 14, 3],
              ]}
            />
          </g>
        );
      })}
    </>
  );
}

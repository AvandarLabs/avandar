import { Arrive } from "../../graphics-common/Arrive";
import { Text } from "../../graphics-common/Text";
import { ForkLabel } from "./ForkLabel/ForkLabel";
import type { DecisionForkInput } from "./DecisionFork.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: DecisionForkInput;
};

/** The authored question and scenario establish the single decision. */
export function DecisionHeading({ frame, input }: Readonly<Props>): ReactNode {
  return (
    <Arrive frame={frame}>
      <ForkLabel
        role="question"
        text={input.prompt}
        x={480}
        y={72}
        width={800}
      />
      <Text role="secondary" x={480} y={154} anchor="middle">
        {input.scenarioLabel}
      </Text>
    </Arrive>
  );
}

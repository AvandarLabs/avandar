import { Arrive, STOCK, Text } from "../../graphics-common";
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
      <ForkLabel text={input.prompt} x={480} y={72} size={24} width={800} />
      <Text x={480} y={154} size={16} anchor="middle" fill={STOCK.muted}>
        {input.scenarioLabel}
      </Text>
    </Arrive>
  );
}

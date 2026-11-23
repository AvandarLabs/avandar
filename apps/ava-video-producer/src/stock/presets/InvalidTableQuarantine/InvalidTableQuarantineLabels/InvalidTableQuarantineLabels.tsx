import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { getQuarantineStateFromFrame } from "../getQuarantineStateFromFrame";
import type { InvalidTableQuarantine } from "../InvalidTableQuarantine";
import type { ReactNode } from "react";

type Props = {
  readable: ReturnType<typeof getQuarantineStateFromFrame>["readable"];
  input: Parameters<typeof InvalidTableQuarantine>[0]["input"];
};

/** Renders the labels with authored geometry. */
export function InvalidTableQuarantineLabels({
  readable,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [
          readable ? input.labels.readable : input.labels.blocked,
          680,
          183,
          230,
          20,
          5,
        ],
        [
          readable ? input.labels.readable : input.labels.invalid,
          110,
          70,
          520,
          18,
          3,
        ],
      ]}
    />
  );
}

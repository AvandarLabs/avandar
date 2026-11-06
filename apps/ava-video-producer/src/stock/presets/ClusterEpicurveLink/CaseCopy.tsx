import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";
/** Inputs for CaseCopy. */
type Props = { input: Input };

/** Fixed headings distinguish the investigation count from the complete set. */
export function CaseCopy({ input }: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={[
        [input.copy.context, 40, 36, 880, 18, 2],
        [input.copy.map, 40, 80, 285, 12, 4],
        [input.copy.curve, 345, 80, 280, 12, 4],
        [input.copy.selected, 40, 496, 290, 12, 4],
        [input.copy.total, 350, 496, 290, 12, 4],
        [input.copy.unit, 660, 496, 290, 12, 4],
        [String(input.investigationCaseIds.length), 40, 580, 150, 28, 1],
        [String(input.cases.length), 350, 580, 150, 28, 1],
      ]}
    />
  );
}

import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { usePracticeStripPresentation } from "./usePracticeStripPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof usePracticeStripPresentation>,
  "input" | "learnerX"
>;
/** Render the practice action labels. */
export function PracticeActionLabels(props: Readonly<Props>): ReactNode {
  return (
    <LabelSlots
      labels={props.input.stops.map((stop, index) => {
        return [
          stop.actionLabel,
          props.learnerX - 150 + index * 160,
          450,
          140,
          12,
          5,
        ];
      })}
    />
  );
}

import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import {
  ledgerMessage,
  headingMessages,
} from "./WideTableToObservations.controls";
import type { Input } from "./WideTableToObservations.schema";
import type { ReactNode } from "react";
/** Inputs for WideLedgerCaptions. */
type Props = { input: Input; frame: number };

/**
 * Explicit long-table headings and a persistent missing-cell omission ledger.
 */
export function WideLedgerCaptions({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const omitted = _countOmittedCells(input);
  const resultHeading = frame < 111 ? input.copy.source : input.copy.result;
  const omissionCaption = `${ledgerMessage.message}: ${omitted}`;
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 52, 40, 856, 18, 2],
          [resultHeading, 52, 96, 856, 14, 2],
        ]}
      />
      <g opacity={motion.ramp(frame, 111, motion.scale(10))}>
        <LabelSlots
          labels={Object.values(headingMessages).map((message, index) => {
            return [
              message.message,
              62 + [0, 218, 440, 650][index],
              130,
              [180, 200, 190, 186][index],
              12,
              1,
            ];
          })}
        />
        <g data-omitted={omitted}>
          <LabelSlots labels={[[omissionCaption, 52, 570, 856, 14, 1]]} />
        </g>
      </g>
    </g>
  );
}

/** How many missing cells the ledger records as omitted. */
function _countOmittedCells(input: Input): number {
  if (input.missingPolicy !== "omit-with-ledger") {
    return 0;
  }
  return input.subjects.reduce((total, subject) => {
    return (
      total +
      subject.values.filter(({ value }) => {
        return value === null;
      }).length
    );
  }, 0);
}

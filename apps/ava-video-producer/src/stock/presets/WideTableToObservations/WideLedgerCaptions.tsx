import { ramp } from "../../../motion";
import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
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
  const omitted =
    input.missingPolicy === "omit-with-ledger"
      ? input.subjects.reduce(
          (total, subject) =>
            total + subject.values.filter(({ value }) => value === null).length,
          0,
        )
      : 0;
  const resultHeading = frame < 111 ? input.copy.source : input.copy.result;
  const omissionCaption = `${stockI18n._(ledgerMessage)}: ${omitted}`;
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 52, 40, 856, 18, 2],
          [resultHeading, 52, 96, 856, 14, 2],
        ]}
      />
      <g opacity={ramp(frame, 111, 10)}>
        <LabelSlots
          labels={Object.values(headingMessages).map((message, index) => [
            stockI18n._(message),
            62 + [0, 218, 440, 650][index],
            130,
            [180, 200, 190, 186][index],
            12,
            1,
          ])}
        />
        <g data-omitted={omitted}>
          <LabelSlots labels={[[omissionCaption, 52, 570, 856, 14, 1]]} />
        </g>
      </g>
    </g>
  );
}

import { STOCK, type GraphicProps } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { ConsentDesk } from "./ConsentDesk";
import { ConsentSlips } from "./ConsentSlips";
import { PreparedContacts } from "./PreparedContacts";
import { SharingHistory } from "./SharingHistory";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Destination-specific withdrawal interrupts preparations, preserving history.
 */
export function ReferralConsentWithdrawal({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.labels.example, 48, 38, 864, 18, 1],
          [input.people.participant, 48, 80, 300, 14, 3],
          [input.people.worker, 610, 80, 300, 14, 3],
        ]}
      />
      <PersonGlyph x={200} y={150} color={accent} />
      <PersonGlyph x={760} y={150} role="worker" color={STOCK.cyan} />
      <ConsentDesk />
      <ConsentSlips frame={frame} input={input} accent={accent} />
      <PreparedContacts frame={frame} input={input} accent={accent} />
      {input.priorRecords.length > 0 ? (
        <SharingHistory input={input} />
      ) : undefined}
    </g>
  );
}

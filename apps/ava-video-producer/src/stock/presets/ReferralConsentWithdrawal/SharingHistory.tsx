import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";
/** Inputs for SharingHistory. */
type Props = { input: Input };

/** Prior sharing receipts remain unchanged through withdrawal. */
export function SharingHistory({ input }: Readonly<Props>): ReactNode {
  return (
    <g data-history="retained">
      <LabelSlots labels={[[input.labels.history, 48, 518, 864, 14, 1]]} />
      {input.priorRecords.map((record, index) => (
        <g key={record.id} data-record={record.id}>
          <rect
            x={48}
            y={524 + index * 38}
            width={864}
            height={34}
            rx={4}
            fill={STOCK.surface}
            stroke={STOCK.line}
          />
          <LabelSlots
            labels={[
              [record.recipient, 58, 536 + index * 38, 410, 12, 1],
              [record.dateLabel, 490, 536 + index * 38, 410, 12, 1],
              [record.summary, 58, 552 + index * 38, 844, 12, 1],
            ]}
          />
        </g>
      ))}
    </g>
  );
}

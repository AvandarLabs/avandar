import { STOCK } from "../../stockPalette";
import { JournalCopy } from "./JournalCopy";
import { JournalTab } from "./JournalTab";
import { ReceiptHalf } from "./ReceiptHalf";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./JournalReceipts.schema";
import type { ReactNode } from "react";
/** Complete receipt-controlled journal input. */
export type Props = GraphicProps & { input: Input };
/**
 * A retained accordion journal closes only obligations matched by authored
 * receipts.
 */
export function JournalReceipts({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const pocketPath =
    input.foldDirection === "horizontal"
      ? "M808 224 h144 v256 h-144 z M808 248 q72 28 144 0"
      : "M690 224 h262 v256 h-262 z M690 248 q131 28 262 0";
  return (
    <g data-fold-direction={input.foldDirection}>
      <path d="M38 532 h770" stroke={STOCK.line} strokeWidth={3} />
      <path d={pocketPath} fill={STOCK.surface} stroke={STOCK.line} />
      <circle cx={70} cy={128} r={5} fill={STOCK.orange} />
      <circle cx={520} cy={128} r={5} fill={accent} />
      {input.entries.map((entry, index) => (
        <JournalTab
          key={entry.id}
          {...{ entry, index, input, frame, accent }}
        />
      ))}
      {input.receipts.map((receipt, index) => (
        <ReceiptHalf
          key={receipt.entryId}
          {...{ receipt, index, input, frame, accent }}
        />
      ))}
      <JournalCopy {...{ frame, input }} />
    </g>
  );
}

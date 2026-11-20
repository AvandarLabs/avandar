import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { JournalCopy } from "./JournalCopy";
import { JournalSpineAndPocket } from "./JournalSpineAndPocket";
import { JournalTab } from "./JournalTab";
import { ReceiptHalf } from "./ReceiptHalf";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-fold-direction={input.foldDirection}>
      <JournalSpineAndPocket foldDirection={input.foldDirection} />
      <circle cx={70} cy={128} r={5} fill={tokens.color.highlight} />
      <circle cx={520} cy={128} r={5} fill={accent} />
      {input.entries.map((entry, index) => {
        return (
          <JournalTab
            key={entry.id}
            {...{ entry, index, input, frame, accent }}
          />
        );
      })}
      {input.receipts.map((receipt, index) => {
        return (
          <ReceiptHalf
            key={receipt.entryId}
            {...{ receipt, index, input, frame, accent }}
          />
        );
      })}
      <JournalCopy {...{ frame, input }} />
    </g>
  );
}

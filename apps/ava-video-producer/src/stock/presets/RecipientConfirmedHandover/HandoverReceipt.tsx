import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { HandoverAcknowledgement } from "./HandoverAcknowledgement";
import { HandoverReceiptRow } from "./HandoverReceiptRow";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Receipt rows fill only after their actual physical units reach the basket.
 */
export function HandoverReceipt({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <rect
        x={704}
        y={90}
        width={226}
        height={467}
        rx={5}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <FitText
        text={input.receiptLabels.heading}
        x={718}
        y={111}
        width={195}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      {input.contents.map((content, index) => (
        <HandoverReceiptRow
          key={content.id}
          input={input}
          frame={frame}
          accent={accent}
          index={index}
        />
      ))}
      <HandoverAcknowledgement input={input} frame={frame} accent={accent} />
    </g>
  );
}

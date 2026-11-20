import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { HandoverAcknowledgement } from "./HandoverAcknowledgement/HandoverAcknowledgement";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={704}
        y={90}
        width={226}
        height={467}
        rx={scales.corner(5)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
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
      {input.contents.map((content, index) => {
        return (
          <HandoverReceiptRow
            key={content.id}
            input={input}
            frame={frame}
            accent={accent}
            index={index}
          />
        );
      })}
      <HandoverAcknowledgement input={input} frame={frame} accent={accent} />
    </g>
  );
}

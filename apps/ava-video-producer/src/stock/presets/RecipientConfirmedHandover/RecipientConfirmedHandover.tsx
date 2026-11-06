import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { HandoverGoodsRow } from "./HandoverGoodsRow";
import { HandoverLabels } from "./HandoverLabels";
import { HandoverReceipt } from "./HandoverReceipt";
import { HandoverRecipient } from "./HandoverRecipient";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./RecipientConfirmedHandover.schema";
import type { ReactNode } from "react";
/** Complete authored handover and shared frame controls. */
export type Props = GraphicProps & { input: Input };
/** Physical recipient selection precedes the quantity acknowledgement. */
export function RecipientConfirmedHandover({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <HandoverLabels input={input} />
      <PersonGlyph x={368} y={95} size={36} role="worker" color={STOCK.cyan} />
      <rect
        x={353}
        y={165}
        width={140}
        height={300}
        rx={8}
        fill={STOCK.elevated}
        stroke={STOCK.line}
        strokeDasharray="4 6"
      />
      <path
        d="M520 165 V475 H678 V165 M520 455 H678 M540 450 V475 M560 450 V475 M580 450 V475 M600 450 V475 M620 450 V475 M640 450 V475 M660 450 V475"
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      {input.contents.map((content, index) => (
        <HandoverGoodsRow
          key={content.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <HandoverRecipient input={input} frame={frame} accent={accent} />
      <HandoverReceipt input={input} frame={frame} accent={accent} />
    </g>
  );
}

import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import { OutboxProposalSheet } from "./OutboxProposalSheet";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  side: "local" | "journal";
  accent: string;
};
const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});
/** Value-bearing provisional halves are written and withdrawn together. */
export function OutboxProposal({
  input,
  frame,
  side,
  accent,
}: Readonly<Props>): ReactNode {
  const writing = ramp(
    frame,
    13 + (side === "journal" ? 2 : 0),
    40,
    EASE.inOut,
  );
  const withdrawal = ramp(frame, 111, 28, EASE.inOut);
  const x = side === "local" ? 100 : 540;
  const graphemes = Array.from(
    GRAPHEMES.segment(input.change.after),
    ({ segment }) => segment,
  );
  const value = graphemes
    .slice(0, Math.ceil(writing * graphemes.length))
    .join("");
  return (
    <g
      data-provisional-half={side}
      opacity={1 - withdrawal}
      transform={`translate(0 ${mix(withdrawal, 0, 34)})`}
    >
      <OutboxProposalSheet x={x} accent={accent} />
      <LabelSlots labels={[[input.labels.pending, x + 12, 402, 296, 12, 3]]} />
      <LiteralDataText x={x + 12} y={455} value={value} />
      <path
        d={`M${x + 12} 465 h${296 * writing}`}
        stroke={STOCK.orange}
        strokeWidth={2}
      />
      {side === "journal" && input.showIdentifier ? (
        <LiteralDataText x={x + 12} y={491} value={input.change.id} />
      ) : undefined}
    </g>
  );
}

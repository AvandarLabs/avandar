import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { OutboxProposalSheet } from "./OutboxProposalSheet";
import { OUTCOME_CUE, UNMOUNT_CUE } from "./outboxShape";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  side: "local" | "journal";
  accent: string;
};

/** Frames each half takes to write its value. */
const WRITE_FRAMES = 40;
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const writing = ramp(
    frame,
    13 + (side === "journal" ? motion.stagger.list : 0),
    motion.scale(WRITE_FRAMES),
    motion.travel.easing,
  );
  // The halves withdraw until they unmount, so this move keeps its cue span.
  const withdrawal = ramp(
    frame,
    OUTCOME_CUE,
    UNMOUNT_CUE - OUTCOME_CUE,
    motion.travel.easing,
  );
  const x = side === "local" ? 100 : 540;
  const graphemes = Array.from(
    GRAPHEMES.segment(input.change.after),
    ({ segment }) => {
      return segment;
    },
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
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 12} 465 h${296 * writing}` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {side === "journal" && input.showIdentifier ? (
        <LiteralDataText x={x + 12} y={491} value={input.change.id} />
      ) : undefined}
    </g>
  );
}

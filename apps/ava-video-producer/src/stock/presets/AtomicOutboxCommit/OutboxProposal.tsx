import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { OutboxProposalSheet } from "./OutboxProposalSheet";
import { OUTCOME_CUE, UNMOUNT_CUE } from "./outboxShape";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { writing, withdrawal } = _getProposalProgress({ frame, side, motion });
  const x = side === "local" ? 100 : 540;
  return (
    <g
      data-provisional-half={side}
      opacity={1 - withdrawal}
      transform={`translate(0 ${mix(withdrawal, 0, 34)})`}
    >
      <OutboxProposalSheet x={x} accent={accent} />
      <LabelSlots labels={[[input.labels.pending, x + 12, 402, 296, 12, 3]]} />
      <LiteralDataText
        x={x + 12}
        y={455}
        value={_buildWrittenValue({ value: input.change.after, writing })}
      />
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
/** A half writing its value, then withdrawing on the outcome, both 0 to 1. */
function _getProposalProgress({
  frame,
  side,
  motion,
}: Readonly<{ frame: number; side: Props["side"]; motion: VideoMotion }>) {
  return {
    writing: ramp(
      frame,
      13 + (side === "journal" ? motion.stagger.list : 0),
      motion.scale(WRITE_FRAMES),
      motion.travel.easing,
    ),
    // The halves withdraw until they unmount, so this move keeps its cue span.
    withdrawal: ramp(
      frame,
      OUTCOME_CUE,
      UNMOUNT_CUE - OUTCOME_CUE,
      motion.travel.easing,
    ),
  };
}
/** The leading graphemes of `value` written so far. */
function _buildWrittenValue({
  value,
  writing,
}: Readonly<{ value: string; writing: number }>): string {
  const graphemes = Array.from(GRAPHEMES.segment(value), ({ segment }) => {
    return segment;
  });
  return graphemes.slice(0, Math.ceil(writing * graphemes.length)).join("");
}

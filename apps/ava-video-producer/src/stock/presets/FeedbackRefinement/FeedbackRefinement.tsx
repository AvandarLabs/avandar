import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { FeedbackDraft } from "./FeedbackDraft";
import { FeedbackNote } from "./FeedbackNote";
import { getFeedbackStateFromInputAndFrame } from "./getFeedbackStateFromInputAndFrame";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Authored feedback travels with a changing draft through sequential
 * reviews.
 */
export function FeedbackRefinement({
  frame,
  input,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const state = getFeedbackStateFromInputAndFrame({ frame, input });
  return (
    <g opacity={ramp(frame, 12, 20)}>
      <FitText
        text={input.artifactLabel}
        x={80}
        y={76}
        width={800}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <path d="M100 330 H860" stroke={STOCK.line} strokeDasharray="4 8" />
      {[input.roleLabels.author, input.roleLabels.reviewer].map(
        (label, index) => (
          <g key={index}>
            <path
              d={`M${100 + 460 * index} 188 V174 H${400 + 460 * index} V188`}
              fill="none"
              stroke={STOCK.line}
            />
            <FitText
              text={label}
              x={250 + 460 * index}
              y={140}
              width={300}
              fontSize={16}
              maxLines={2}
              anchor="middle"
              breakLongWords
              normalizeWhitespace
            />
          </g>
        ),
      )}
      {input.showRoundLabels ? (
        <FitText
          text={state.round.label}
          x={state.x + 150}
          y={208}
          width={300}
          fontSize={14}
          maxLines={1}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
          color={STOCK.muted}
        />
      ) : undefined}
      <FeedbackDraft state={state} accent={accent} id={id} />
      <g opacity={ramp(frame, state.doneAt, 12)}>
        <FitText
          text={input.finalLabel}
          x={480}
          y={460}
          width={780}
          fontSize={20}
          maxLines={2}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
          color={accent}
        />
      </g>
      {input.rounds.map((round, index) => (
        <FeedbackNote
          key={round.draft}
          frame={frame}
          round={round}
          index={index}
          numRounds={input.rounds.length}
          showReviewTrail={input.showReviewTrail}
        />
      ))}
    </g>
  );
}

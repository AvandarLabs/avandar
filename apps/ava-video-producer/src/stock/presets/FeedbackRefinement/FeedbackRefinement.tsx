import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FeedbackDraft } from "./FeedbackDraft";
import { FeedbackNote } from "./FeedbackNote";
import { getFeedbackStateFromInputAndFrame } from "./getFeedbackStateFromInputAndFrame";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Frames the whole study takes to fade in. */
const INTRO_FRAMES = 20;
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
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const state = getFeedbackStateFromInputAndFrame({ frame, input, motion });
  return (
    <g
      opacity={ramp(
        frame,
        12,
        motion.scale(INTRO_FRAMES),
        motion.reveal.easing,
      )}
    >
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
      <SketchedShape
        shape={{ kind: "path", d: "M100 330 H860" }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.line}
        strokeDasharray={atomic.dash.airy.join(" ")}
      />
      {[input.roleLabels.author, input.roleLabels.reviewer].map(
        (label, index) => {
          return (
            <g key={index}>
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${100 + 460 * index} 188 V174 H${400 + 460 * index} V188`,
                }}
                profile={tokens.sketch.shape}
                fill="none"
                stroke={tokens.color.line}
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
          );
        },
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
          color={tokens.color.textMuted}
        />
      ) : undefined}
      <FeedbackDraft state={state} accent={accent} id={id} />
      <g opacity={motion.reveal(frame, state.doneAt)}>
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
      {input.rounds.map((round, index) => {
        return (
          <FeedbackNote
            key={round.draft}
            frame={frame}
            round={round}
            index={index}
            numRounds={input.rounds.length}
            showReviewTrail={input.showReviewTrail}
          />
        );
      })}
    </g>
  );
}

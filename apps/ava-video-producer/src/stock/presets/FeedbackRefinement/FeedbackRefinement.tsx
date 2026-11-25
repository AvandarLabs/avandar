import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ArtifactHeadingAndGuide } from "./ArtifactHeadingAndGuide";
import { CurrentReviewRound } from "./CurrentReviewRound";
import { FinalArtifactCaption } from "./FinalArtifactCaption";
import { getFeedbackStateFromInputAndFrame } from "./getFeedbackStateFromInputAndFrame";
import { ReviewNotes } from "./ReviewNotes";
import { ReviewRoleBrackets } from "./ReviewRoleBrackets";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & {
  input: Input;
};

/** Frames the whole study takes to fade in. */
const INTRO_FRAMES = 20;

/**
 * Authored feedback travels with a changing draft through sequential reviews.
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
      opacity={Motion.ramp({
        frame,
        at: 12,
        dur: motion.scale(INTRO_FRAMES),
        easing: motion.reveal.easing,
      })}
    >
      <ArtifactHeadingAndGuide input={input} atomic={atomic} tokens={tokens} />
      <ReviewRoleBrackets
        labels={[input.roleLabels.author, input.roleLabels.reviewer]}
        tokens={tokens}
      />
      <CurrentReviewRound
        input={input}
        accent={accent}
        id={id}
        tokens={tokens}
        state={state}
      />
      <FinalArtifactCaption
        frame={frame}
        input={input}
        accent={accent}
        motion={motion}
        state={state}
      />
      <ReviewNotes input={input} frame={frame} />
    </g>
  );
}

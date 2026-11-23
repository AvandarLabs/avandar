import { FitText } from "../../primitives/FitText/FitText";
import { FeedbackDraft } from "./FeedbackDraft";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./FeedbackRefinement.schema";
import type { getFeedbackStateFromInputAndFrame } from "./getFeedbackStateFromInputAndFrame";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  id: Readonly<ParentProps>["id"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  state: ReturnType<typeof getFeedbackStateFromInputAndFrame>;
};

/** Renders the current review round in authored paint order. */
export function CurrentReviewRound(options: Readonly<Props>): ReactNode {
  return (
    <>
      {options.input.showRoundLabels ? (
        <FitText
          text={options.state.round.label}
          x={options.state.x + 150}
          y={208}
          width={300}
          fontSize={14}
          maxLines={1}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
          color={options.tokens.color.textMuted}
        />
      ) : undefined}
      <FeedbackDraft
        state={options.state}
        accent={options.accent}
        id={options.id}
      />
    </>
  );
}

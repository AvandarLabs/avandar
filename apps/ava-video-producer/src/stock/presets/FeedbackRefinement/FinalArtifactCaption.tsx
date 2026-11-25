import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./FeedbackRefinement.schema";
import type { getFeedbackStateFromInputAndFrame } from "./getFeedbackStateFromInputAndFrame";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  state: ReturnType<typeof getFeedbackStateFromInputAndFrame>;
};

/** Renders the final artifact caption in authored paint order. */
export function FinalArtifactCaption(options: Readonly<Props>): ReactNode {
  return (
    <g opacity={options.motion.reveal(options.frame, options.state.doneAt)}>
      <FitText
        text={options.input.finalLabel}
        x={480}
        y={460}
        width={780}
        fontSize={20}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
        color={options.accent}
      />
    </g>
  );
}

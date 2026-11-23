import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { FeedbackNoteGetFeedbackNoteTravelValue } from "../FeedbackNote";
import type { ReactNode } from "react";

type Props = {
  index: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  detach: FeedbackNoteGetFeedbackNoteTravelValue["detach"];
  draftX: FeedbackNoteGetFeedbackNoteTravelValue["draftX"];
  x: FeedbackNoteGetFeedbackNoteTravelValue["x"];
  y: FeedbackNoteGetFeedbackNoteTravelValue["y"];
};
/** Connects the returning note to its detaching feedback tab. */
export function FeedbackNoteTether({
  index,
  tokens,
  detach,
  draftX,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <g data-feedback-tether={index}>
        <SketchedShape
          shape={{ kind: "path", d: `M${draftX + 150} 320 L${x + 160} ${y}` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          opacity={1 - detach}
        />
      </g>
    </>
  );
}

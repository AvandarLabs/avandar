import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ExtractionRow } from "./ExtractionRow";
import { getAssociationFromInput } from "./getAssociationFromInput";
import { ReviewChoiceMark } from "./ReviewChoiceMark";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
/** Frames the reviewed extraction takes to slide into place. */
const EXTRACT_FRAMES = 43;
/**
 * Review carries the source token and coordinates without changing evidence.
 */
export function ReviewedExtraction({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const association = getAssociationFromInput(input);
  const progress = Motion.ramp({
    frame,
    at: 96,
    dur: motion.scale(EXTRACT_FRAMES),
    easing: motion.travel.easing,
  });
  const x = Motion.mix({
    t: progress,
    from: 588,
    to: 540,
  });
  return (
    <g
      opacity={progress}
      data-unresolved={input.reviewedLabelId === null}
      data-chosen-label={association.chosenLabel?.id}
    >
      <g data-extracted-source-link="true">
        <SketchedShape
          shape={{ kind: "path", d: `M100 153 H520 V545 H${x}` }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeDasharray={tokens.dash.guide.join(" ")}
        />
      </g>
      <ExtractionRow input={input} x={x} accent={accent} />
      <ReviewChoiceMark input={input} accent={accent} rowRight={x + 360} />
    </g>
  );
}

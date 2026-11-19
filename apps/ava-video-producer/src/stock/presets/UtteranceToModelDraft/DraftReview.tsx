import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** Review copy and acceptance reflect only the supplied human decision. */
export function DraftReview({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g opacity={motion.ramp(frame, 106, motion.scale(29))}>
      <LabelSlots
        labels={[
          [input.review.reviewerLabel, 60, 515, 400, 12, 3],
          [input.review.note, 480, 515, 420, 12, 3],
          [
            input.review.outcome === "accept"
              ? input.copy.accepted
              : input.copy.pending,
            60,
            565,
            810,
            12,
            2,
          ],
        ]}
      />
      {input.review.outcome === "accept" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M875 560 L883 568 L901 548" }}
          profile={tokens.sketch.shape}
          data-acceptance="true"
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      ) : undefined}
    </g>
  );
}

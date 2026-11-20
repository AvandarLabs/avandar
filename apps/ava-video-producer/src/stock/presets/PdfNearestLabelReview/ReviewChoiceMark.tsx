import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string; rowRight: number };
/**
 * An unresolved bracket retains both candidates, or one human choice is keyed.
 */
export function ReviewChoiceMark({
  input,
  accent,
  rowRight,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const width = scales.stroke(tokens.stroke.default);
  return (
    <g>
      {" "}
      {input.reviewedLabelId === null ? (
        <g data-unresolved-bracket="true">
          <SketchedShape
            shape={{ kind: "path", d: "M920 190 h8 v192 h-8" }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={tokens.color.highlight}
            strokeWidth={width}
          />
        </g>
      ) : (
        <g data-review-choice={input.reviewedLabelId}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M904 ${
                225 +
                input.labels.findIndex(({ id }) => {
                  return id === input.reviewedLabelId;
                }) *
                  95
              } H${rowRight + 8} V440 H${rowRight}`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={width}
          />
        </g>
      )}
    </g>
  );
}

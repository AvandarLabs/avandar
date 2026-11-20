import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./PocketInference.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/**
 * Response lines are literal authored content whose quantity owns the writing
 * strokes.
 */
export function ResponseWriting({ input, accent }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const labels = [
    { text: input.response.label, y: 354, maxLines: 1, color: accent },
    ...input.response.lines.map((text, index) => {
      return {
        text,
        y: 378 + index * 34,
        maxLines: 2,
        color: tokens.color.text,
      };
    }),
  ];
  return (
    <g>
      {input.showLabels
        ? labels.map((label) => {
            return (
              <FitText
                key={label.y}
                {...label}
                x={214}
                width={532}
                fontSize={12}
                normalizeWhitespace
                breakLongWords
              />
            );
          })
        : input.response.lines.map((_, index) => {
            return <ResponseStroke key={index} index={index} accent={accent} />;
          })}
    </g>
  );
}

/** One writing stroke standing in for a response line. */
function ResponseStroke({
  index,
  accent,
}: Readonly<{ index: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M214 ${378 + index * 34} h${490 - index * 32}`,
      }}
      profile={tokens.sketch.shape}
      data-response-stroke={index}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
    />
  );
}

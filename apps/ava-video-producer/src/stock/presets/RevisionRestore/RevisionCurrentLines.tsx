import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  content: Array<string | undefined>;
  previous: string[];
  selected: string[];
  frame: number;
};
/** Positional line slots replace current text and clear change notches. */
export function RevisionCurrentLines({
  input,
  content,
  previous,
  selected,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const numLines = Math.max(previous.length, selected.length);
  return (
    <g>
      {Array.from({ length: numLines }, (_, index) => {
        return (
          <g key={index}>
            {content[index] !== undefined ? (
              <FitText
                text={content[index]}
                x={294}
                y={176 + index * 53}
                width={370}
                fontSize={16}
                maxLines={3}
                normalizeWhitespace
                breakLongWords
              />
            ) : undefined}
            {input.showChangedLines &&
            frame < 126 &&
            previous[index] !== selected[index] ? (
              <SketchedShape
                shape={{ kind: "path", d: `M278 ${168 + index * 53} h8` }}
                profile={tokens.sketch.shape}
                data-change-notch={index}
                stroke={tokens.color.highlight}
                strokeWidth={scales.stroke(tokens.stroke.heavy)}
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}

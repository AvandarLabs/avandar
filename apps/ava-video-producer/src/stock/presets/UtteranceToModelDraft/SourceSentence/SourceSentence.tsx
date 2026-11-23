import { prop } from "@avandar/utils";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { SENTENCE_FONT_SIZE } from "../getPhrasePositionsFromSentenceParts";
import { SourceSentenceBacking } from "./SourceSentenceBacking";
import { useSourceSentencePresentation } from "./useSourceSentencePresentation";
import type { Input } from "../UtteranceToModelDraft.schema.ts";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  accent: string;
  background: string;
};
/** Exact fragments stay in place while only mapped fragments are underlined. */
export function SourceSentence(props: Readonly<Props>): ReactNode {
  const presentation = useSourceSentencePresentation(props);

  return (
    <g aria-label={props.input.sentenceParts.map(prop("text")).join("")}>
      <SourceSentenceBacking {...presentation} />
      {presentation.parts.map((part) => {
        return (
          <g key={part.id} data-source-fragment={part.id}>
            <text
              aria-label={part.text}
              x={part.x}
              y={part.y}
              fill={presentation.tokens.color.text}
              fontSize={SENTENCE_FONT_SIZE}
              fontFamily={presentation.tokens.text.graphic.data.fontFamily}
              fontWeight={presentation.tokens.text.graphic.data.fontWeight}
              xmlSpace="preserve"
            >
              {part.text}
            </text>
            {presentation.mapped.has(part.id) ? (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${part.x} ${part.y + 8} h${part.width * presentation.motion.ramp(props.frame, 12, presentation.motion.scale(36))}`,
                }}
                profile={presentation.tokens.sketch.shape}
                stroke={props.accent}
                strokeWidth={presentation.scales.stroke(
                  presentation.tokens.stroke.default,
                )}
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}

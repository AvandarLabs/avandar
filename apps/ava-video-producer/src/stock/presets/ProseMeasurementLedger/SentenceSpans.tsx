import { prop } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getSentenceGlyphsFromInput } from "./getSentenceGlyphsFromInput";
import type { Input } from "./ProseMeasurementLedger.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const PATTERNS: Record<string, string> = {
  subject: "1 0",
  metric: "5 2",
  value: "1 2",
  unit: "8 3",
  period: "3 2 1 2",
  qualifier: "2 4",
};
/** Original sentence stays intact while exact authored spans gain guides. */
export function SentenceSpans({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  let offset = 0;
  const spans = input.fragments.map((fragment) => {
    const start = offset + fragment.contentStart,
      end = offset + fragment.contentEnd;
    offset += fragment.text.length;
    return { ...fragment, start, end };
  });
  return (
    <g aria-label={input.fragments.map(prop("text")).join("")}>
      {getSentenceGlyphsFromInput(input).map((glyph, index) => {
        const spanIndex = spans.findIndex((span) => {
          return (
            span.role !== "connector" &&
            glyph.start < span.end &&
            glyph.end > span.start
          );
        });
        return (
          <g key={index}>
            <text
              x={glyph.x}
              y={glyph.y}
              fontSize={16}
              fontFamily="Arial, sans-serif"
              fill={tokens.color.text}
            >
              {glyph.text}
            </text>
            {input.showSourceSpans && spanIndex >= 0 ? (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M${glyph.x} ${glyph.y + 6} h${Math.max(2, glyph.width)}`,
                }}
                profile={tokens.sketch.shape}
                data-source-span={spans[spanIndex].role}
                stroke={accent}
                strokeDasharray={PATTERNS[spans[spanIndex].role]}
                opacity={motion.ramp(frame, 13 + spanIndex * 3, motion.hero)}
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}

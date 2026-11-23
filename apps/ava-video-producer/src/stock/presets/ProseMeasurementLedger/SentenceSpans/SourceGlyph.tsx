import { SketchedShape } from "../../../primitives/SketchedShape";
import { SentenceGlyphText } from "./SentenceGlyphText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getSentenceGlyphsFromInput } from "../getSentenceGlyphsFromInput";
import type { Input } from "../ProseMeasurementLedger.schema";
import type { ReactNode } from "react";

type ParentProps = { input: Input; frame: number; accent: string };

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  spans: Array<Input["fragments"][number] & { start: number; end: number }>;
  glyph: ReturnType<typeof getSentenceGlyphsFromInput>[number];
};

/**
 * Each span role keeps its own guide dash. The qualifier reads the theme's
 * dotted step; the other patterns encode their role and have no step.
 */
const PATTERNS: Record<string, string | undefined> = {
  subject: "1 0",
  metric: "5 2",
  value: "1 2",
  unit: "8 3",
  period: "3 2 1 2",
  qualifier: undefined,
};

/** Renders the source glyph in authored paint order. */
export function SourceGlyph({
  input,
  frame,
  accent,
  tokens,
  atomic,
  motion,
  spans,
  glyph,
}: Readonly<Props>): ReactNode {
  const spanIndex = spans.findIndex((span) => {
    return (
      span.role !== "connector" &&
      glyph.start < span.end &&
      glyph.end > span.start
    );
  });
  return (
    <g>
      <SentenceGlyphText tokens={tokens} glyph={glyph} />
      {input.showSourceSpans && spanIndex >= 0 ? (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${glyph.x} ${glyph.y + 6} h${Math.max(2, glyph.width)}`,
          }}
          profile={tokens.sketch.shape}
          data-source-span={spans[spanIndex].role}
          stroke={accent}
          strokeDasharray={
            PATTERNS[spans[spanIndex].role] ?? atomic.dash.dotted.join(" ")
          }
          opacity={motion.ramp(
            frame,
            13 + spanIndex * motion.scaleStagger(3),
            motion.hero,
          )}
        />
      ) : undefined}
    </g>
  );
}

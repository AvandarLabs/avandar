import { prop } from "@avandar/utils";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getSentenceGlyphsFromInput } from "../getSentenceGlyphsFromInput";
import { SourceGlyph } from "./SourceGlyph";
import type { Input } from "../ProseMeasurementLedger.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

/** Original sentence stays intact while exact authored spans gain guides. */
export function SentenceSpans({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const motion = GraphicThemeHooks.useGraphicMotion();
  let offset = 0;
  const spans: Array<
    Input["fragments"][number] & { start: number; end: number }
  > = input.fragments.map((fragment) => {
    const start = offset + fragment.contentStart,
      end = offset + fragment.contentEnd;
    offset += fragment.text.length;
    return { ...fragment, start, end };
  });
  return (
    <g
      aria-label={input.fragments.map(prop("text")).join("")}
      data-source-glyph-run
    >
      {getSentenceGlyphsFromInput(input).map((glyph) => {
        return (
          <SourceGlyph
            key={glyph.start}
            input={input}
            frame={frame}
            accent={accent}
            tokens={tokens}
            atomic={atomic}
            motion={motion}
            spans={spans}
            glyph={glyph}
          />
        );
      })}
    </g>
  );
}

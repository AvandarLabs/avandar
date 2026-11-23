import {
  type getSentenceGlyphsFromInput,
  SENTENCE_FONT_SIZE,
} from "../getSentenceGlyphsFromInput";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  glyph: ReturnType<typeof getSentenceGlyphsFromInput>[number];
};

/** Renders the sentence spanstext in authored paint order. */
export function SentenceGlyphText(options: Readonly<Props>): ReactNode {
  return (
    <text
      x={options.glyph.x}
      y={options.glyph.y}
      fontSize={SENTENCE_FONT_SIZE}
      fontFamily={options.tokens.text.graphic.secondary.fontFamily}
      fontWeight={options.tokens.text.graphic.secondary.fontWeight}
      fill={options.tokens.color.text}
    >
      {options.glyph.text}
    </text>
  );
}

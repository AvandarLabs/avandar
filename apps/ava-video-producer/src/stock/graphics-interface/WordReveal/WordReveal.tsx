import { getStockDisplayCopyFromDescriptor } from "../../copy/getStockDisplayCopyFromDescriptor/getStockDisplayCopyFromDescriptor";
import { Eyebrow } from "../../graphics-common/Eyebrow";
import { LEGACY_DISPLAY_COPY } from "../../presets/legacy/legacyDisplayCopy";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getPositionedWordsFromInput } from "./getPositionedWordsFromInput";
import { RevealArrow } from "./RevealArrow";
import { RevealingWord } from "./RevealingWord";
import { RevealNotes } from "./RevealNotes";
import { WordMasks } from "./WordMasks";
import type { Props } from "./WordReveal.types";
import type { ReactNode } from "react";

/** Renders the authored word study for StockGraphic at a given frame. */
export function WordReveal(props: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const words = getPositionedWordsFromInput(props.input);
  const drawing = { ...props, color, stroke, sketch, shapes, motion, words };
  return (
    <g>
      <WordMasks {...drawing} />
      <Eyebrow x={80}>
        {getStockDisplayCopyFromDescriptor({
          descriptor: LEGACY_DISPLAY_COPY["word-reveal"].maskedWordReveal,
        })}
      </Eyebrow>
      {words.map((word, wordIndex) => {
        return (
          <RevealingWord key={word.word} {...{ ...drawing, word, wordIndex }} />
        );
      })}
      <RevealArrow {...drawing} />
      <RevealNotes {...drawing} />
    </g>
  );
}

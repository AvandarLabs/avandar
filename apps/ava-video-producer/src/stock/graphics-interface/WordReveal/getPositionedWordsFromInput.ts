import type { WordRevealInput } from "../../presets/WordReveal/WordReveal.schema";
import type { PositionedWord } from "./WordReveal.types";

/** Supplies WordReveal with frame-specific rendering geometry or progress. */
export function getPositionedWordsFromInput(
  input: Readonly<WordRevealInput>,
): PositionedWord[] {
  return input.words.map((word, index) => {
    return {
      ...word,
      ...[
        { x: 76, y: 263, size: 91, width: 232, at: 15 },
        { x: 329, y: 263, size: 91, width: 236, at: 23 },
        { x: 72, y: 417, size: 137, width: 414, at: 36 },
      ][index],
    };
  });
}

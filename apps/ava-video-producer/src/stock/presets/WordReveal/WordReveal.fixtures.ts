import type { WordRevealInput } from "./WordReveal.schema";

/** Complete fictional example used only when input is omitted. */
export const WORD_REVEAL_DEFAULT_INPUT: WordRevealInput = {
  words: [
    { word: "Make", accented: false },
    { word: "ideas", accented: false },
    { word: "move.", accented: true },
  ],
  showArrow: true,
};

/** The maximum supported collection density in the authored layout. */
export const wordRevealDenseInput: WordRevealInput = {
  ...WORD_REVEAL_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const wordRevealChangedInput: WordRevealInput = {
  ...WORD_REVEAL_DEFAULT_INPUT,
  words: [
    { word: "See", accented: false },
    { word: "ideas", accented: true },
  ],
  showArrow: false,
};

/** Named examples available to editors and semantic regression checks. */
export const wordRevealFixtures: Array<{
  id: string;
  input: {
    words: Array<{ word: string; accented: boolean }>;
    showArrow: boolean;
  };
}> = [
  { id: "default", input: WORD_REVEAL_DEFAULT_INPUT },
  { id: "dense", input: wordRevealDenseInput },
  { id: "changed", input: wordRevealChangedInput },
];

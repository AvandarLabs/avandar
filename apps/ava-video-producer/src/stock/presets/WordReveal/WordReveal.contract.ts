import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  WORD_REVEAL_DEFAULT_INPUT,
  wordRevealFixtures,
} from "./WordReveal.fixtures";
import {
  wordRevealMetadata,
  WORD_REVEAL_DEFAULT_TEXT_PATHS,
} from "./WordReveal.metadata";
import { wordRevealInputSchema } from "./WordReveal.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const wordRevealContract: StockContract<
  typeof WORD_REVEAL_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "word-reveal",
  inputSchema: wordRevealInputSchema,
  defaultInput: WORD_REVEAL_DEFAULT_INPUT,
  fixtures: wordRevealFixtures,
  metadata: wordRevealMetadata,
  defaultTextPaths: WORD_REVEAL_DEFAULT_TEXT_PATHS,
  semanticRules: [
    {
      id: "fixed-word-masks",
      paths: ["words.*.word"],
      description:
        "Every authored word must fit its fixed mask at the slot-specific type size.",
    },
  ],
});

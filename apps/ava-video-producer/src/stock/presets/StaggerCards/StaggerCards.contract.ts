import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  staggerCardsDefaultInput,
  staggerCardsFixtures,
} from "./StaggerCards.fixtures";
import {
  staggerCardsMetadata,
  STAGGER_CARDS_DEFAULT_TEXT_PATHS,
} from "./StaggerCards.metadata";
import { staggerCardsInputSchema } from "./StaggerCards.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const staggerCardsContract: StockContract<
  typeof staggerCardsDefaultInput
> = makeLegacyContractFromDefinition({
  id: "stagger-cards",
  inputSchema: staggerCardsInputSchema,
  defaultInput: staggerCardsDefaultInput,
  fixtures: staggerCardsFixtures,
  metadata: staggerCardsMetadata,
  defaultTextPaths: STAGGER_CARDS_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});

import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  PLEXUS_FIELD_DEFAULT_INPUT,
  plexusFieldFixtures,
} from "./PlexusField.fixtures";
import {
  plexusFieldMetadata,
  PLEXUS_FIELD_DEFAULT_TEXT_PATHS,
} from "./PlexusField.metadata";
import { plexusFieldInputSchema } from "./PlexusField.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const plexusFieldContract: StockContract<
  typeof PLEXUS_FIELD_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "plexus-field",
  inputSchema: plexusFieldInputSchema,
  defaultInput: PLEXUS_FIELD_DEFAULT_INPUT,
  fixtures: plexusFieldFixtures,
  metadata: plexusFieldMetadata,
  defaultTextPaths: PLEXUS_FIELD_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});

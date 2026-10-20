import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  orbitalSystemDefaultInput,
  orbitalSystemFixtures,
} from "./OrbitalSystem.fixtures";
import {
  orbitalSystemMetadata,
  ORBITAL_SYSTEM_DEFAULT_TEXT_PATHS,
} from "./OrbitalSystem.metadata";
import { orbitalSystemInputSchema } from "./OrbitalSystem.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const orbitalSystemContract: StockContract<
  typeof orbitalSystemDefaultInput
> = makeLegacyContractFromDefinition({
  id: "orbital-system",
  inputSchema: orbitalSystemInputSchema,
  defaultInput: orbitalSystemDefaultInput,
  fixtures: orbitalSystemFixtures,
  metadata: orbitalSystemMetadata,
  defaultTextPaths: ORBITAL_SYSTEM_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});

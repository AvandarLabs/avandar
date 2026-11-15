import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  RADIAL_NETWORK_DEFAULT_INPUT,
  radialNetworkFixtures,
} from "./RadialNetwork.fixtures";
import {
  radialNetworkMetadata,
  RADIAL_NETWORK_DEFAULT_TEXT_PATHS,
} from "./RadialNetwork.metadata";
import { radialNetworkInputSchema } from "./RadialNetwork.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const radialNetworkContract: StockContract<
  typeof RADIAL_NETWORK_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "radial-network",
  inputSchema: radialNetworkInputSchema,
  defaultInput: RADIAL_NETWORK_DEFAULT_INPUT,
  fixtures: radialNetworkFixtures,
  metadata: radialNetworkMetadata,
  defaultTextPaths: RADIAL_NETWORK_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});

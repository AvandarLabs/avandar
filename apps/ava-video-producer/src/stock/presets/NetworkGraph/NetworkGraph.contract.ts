import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  NETWORK_GRAPH_DEFAULT_INPUT,
  networkGraphFixtures,
} from "./NetworkGraph.fixtures";
import {
  networkGraphMetadata,
  NETWORK_GRAPH_DEFAULT_TEXT_PATHS,
} from "./NetworkGraph.metadata";
import { networkGraphInputSchema } from "./NetworkGraph.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const networkGraphContract: StockContract<
  typeof NETWORK_GRAPH_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "network-graph",
  inputSchema: networkGraphInputSchema,
  defaultInput: NETWORK_GRAPH_DEFAULT_INPUT,
  fixtures: networkGraphFixtures,
  metadata: networkGraphMetadata,
  defaultTextPaths: NETWORK_GRAPH_DEFAULT_TEXT_PATHS,
  semanticRules: [
    {
      id: "valid-edge-references",
      paths: ["nodes", "edges"],
      description: "Edges reference distinct existing node indices.",
    },
  ],
});

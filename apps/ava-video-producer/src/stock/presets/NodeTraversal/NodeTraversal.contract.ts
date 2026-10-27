import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  NODE_TRAVERSAL_DEFAULT_INPUT,
  nodeTraversalFixtures,
} from "./NodeTraversal.fixtures";
import {
  nodeTraversalMetadata,
  NODE_TRAVERSAL_DEFAULT_TEXT_PATHS,
} from "./NodeTraversal.metadata";
import { nodeTraversalInputSchema } from "./NodeTraversal.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const nodeTraversalContract: StockContract<
  typeof NODE_TRAVERSAL_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "node-traversal",
  inputSchema: nodeTraversalInputSchema,
  defaultInput: NODE_TRAVERSAL_DEFAULT_INPUT,
  fixtures: nodeTraversalFixtures,
  metadata: nodeTraversalMetadata,
  defaultTextPaths: NODE_TRAVERSAL_DEFAULT_TEXT_PATHS,
  semanticRules: [
    {
      id: "connected-route",
      paths: ["route", "edges", "nodes"],
      description:
        "Route indices reference existing nodes and adjacent authored directed edges. Every edge, including unused edges, references two existing distinct nodes. Duplicate directed edges remain accepted.",
    },
  ],
});

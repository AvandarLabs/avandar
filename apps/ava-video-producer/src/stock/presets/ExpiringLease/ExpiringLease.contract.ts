import { CONTROLS } from "./ExpiringLease.controls";
import { DEFAULT_INPUT, fixtures } from "./ExpiringLease.fixtures";
import { METADATA } from "./ExpiringLease.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ExpiringLease.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Complete renderer-free contract for this authored animation. */
export const expiringLeaseContract = {
  id: "expiring-lease",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls: CONTROLS,
  defaultTextPaths: [
    ["participants", 0, "label"],
    ["participants", 1, "label"],
    ["participants", 2, "label"],
    ["permissionLabel"],
    ["lifetime", "unit"],
    ["copy", "dock"],
    ["copy", "held"],
    ["copy", "expired"],
    ["copy", "unassigned"],
    ["copy", "example"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.expiring-lease.bindingExamples.0.sourceText",
        message:
          "In the fictional shared editor, editor A borrows an editing lease for four example turns, then the permission returns to the pool instead of passing automatically to editor B.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;

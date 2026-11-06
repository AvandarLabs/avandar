import { CONTROLS } from "./DashboardSlotAssembly.controls";
import { DEFAULT_INPUT, fixtures } from "./DashboardSlotAssembly.fixtures";
import { METADATA } from "./DashboardSlotAssembly.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./DashboardSlotAssembly.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Complete renderer-free contract for this authored animation. */
export const dashboardSlotAssemblyContract = {
  id: "dashboard-slot-assembly",
  schemaVersion: 1,
  metadataVersion: 2,
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
    ["boardTitle"],
    ["widgets", 0, "title"],
    ["widgets", 0, "lines", 0],
    ["widgets", 1, "title"],
    ["widgets", 1, "lines", 0],
    ["widgets", 1, "lines", 1],
    ["widgets", 1, "lines", 2],
    ["widgets", 2, "title"],
    ["widgets", 2, "lines", 0],
    ["scopeLabel"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.dashboard-slot-assembly.bindingExamples.0.sourceText",
        message:
          "In this fictional workspace, place the stock figure beside supply details to create one dashboard.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;

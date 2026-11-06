import { controls } from "./EntitySpineAssembly.controls";
import { DEFAULT_INPUT, FIXTURES } from "./EntitySpineAssembly.fixtures";
import { METADATA } from "./EntitySpineAssembly.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./EntitySpineAssembly.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free authored contract. */
export const entitySpineAssemblyContract = {
  id: "entity-spine-assembly",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  metadata: METADATA,
  controls,
  defaultTextPaths: [
    ["entities", 0, "label"],
    ["entities", 1, "label"],
    ["entities", 2, "label"],
    ["field", "label"],
    ["field", "unit"],
    ["field", "missingLabel"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.entity-spine-assembly.bindingExamples.0.sourceText",
        message:
          "Keep one record each for Site A, B and C. Sum A observations 2 and 3, use B observation 4, and leave C missing because it has no observation.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;

import { z } from "zod";
import { DEFAULT_INPUT, fixtures } from "./WorkspaceCapacityExtension.fixtures";
import {
  METADATA,
  controls,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./WorkspaceCapacityExtension.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./WorkspaceCapacityExtension.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete content contract without rendering dependencies. */
export const workspaceCapacityExtensionContract = {
  id: "workspace-capacity-extension",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
} satisfies StockContract<Input>;

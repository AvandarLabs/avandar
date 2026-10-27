import { z } from "zod";
import { controls } from "./ClusterEpicurveLink.controls";
import { defaultInput, fixtures } from "./ClusterEpicurveLink.fixtures";
import {
  METADATA,
  DEFAULT_TEXT_PATHS,
  bindingExamples,
} from "./ClusterEpicurveLink.metadata";
import {
  inputSchema,
  SEMANTIC_RULES,
  type Input,
} from "./ClusterEpicurveLink.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete renderer-free content and editing contract. */
export const clusterEpicurveLinkContract = {
  id: "cluster-epicurve-link",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "social-sector",
  loopFrames: 180,
  inputSchema,
  jsonSchema: z.toJSONSchema(inputSchema),
  semanticRules: SEMANTIC_RULES,
  defaultInput,
  fixtures,
  metadata: METADATA,
  defaultTextPaths: DEFAULT_TEXT_PATHS,
  bindingExamples,
  controls,
} satisfies StockContract<Input>;

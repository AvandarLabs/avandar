import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  DATA_PIPELINE_DEFAULT_INPUT,
  dataPipelineFixtures,
} from "./DataPipeline.fixtures";
import {
  dataPipelineMetadata,
  DATA_PIPELINE_DEFAULT_TEXT_PATHS,
} from "./DataPipeline.metadata";
import { dataPipelineInputSchema } from "./DataPipeline.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const dataPipelineContract: StockContract<
  typeof DATA_PIPELINE_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "data-pipeline",
  inputSchema: dataPipelineInputSchema,
  defaultInput: DATA_PIPELINE_DEFAULT_INPUT,
  fixtures: dataPipelineFixtures,
  metadata: dataPipelineMetadata,
  defaultTextPaths: DATA_PIPELINE_DEFAULT_TEXT_PATHS,
  semanticRules: [],
});

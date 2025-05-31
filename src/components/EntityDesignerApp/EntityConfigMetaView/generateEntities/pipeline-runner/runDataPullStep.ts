import { LocalDatasetClient } from "@/models/LocalDataset/LocalDatasetClient";
import { PullDataStepConfig } from "../pipelineTypes";
import { PipelineContext } from "./runPipeline";

export async function runDataPullStep(
  stepConfig: PullDataStepConfig,
  context: PipelineContext,
): Promise<PipelineContext> {
  if (stepConfig.datasetType !== "local") {
    throw new Error("Only local datasets are supported for now");
  }

  const dataset = await LocalDatasetClient.getParsedLocalDataset({
    id: stepConfig.datasetId,
  });

  return context.storeDataset(dataset);
}

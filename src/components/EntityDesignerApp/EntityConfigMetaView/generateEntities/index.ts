import { makePipelineFromEntityConfig } from "./makePipelineFromEntityConfig";
import { runPipeline } from "./pipeline-runner/runPipeline";
import { BuildableEntityConfig } from "./pipelineTypes";

export async function generateEntities(
  entityConfig: BuildableEntityConfig,
): Promise<void> {
  const pipeline = makePipelineFromEntityConfig(entityConfig);
  await runPipeline(pipeline);
}

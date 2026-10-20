import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createWdiEtlEngine } from "@pipelines/world-bank__wdi/createWdiEtlEngine/createWdiEtlEngine";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/**
 * Runs the World Bank WDI pipeline and returns the pipeline run id.
 *
 * @param options.limit - Process at most this many input CSVs.
 */
export async function run(options: PipelineRunOptions = {}): Promise<string> {
  const report = await createWdiEtlEngine(getPipelineEtlDestination()).run({
    mode: "full",
    limit: options.limit,
  });
  return report.pipelineRunId;
}

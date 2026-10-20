import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createWdiEtlEngine } from "@pipelines/world-bank__wdi/createWdiEtlEngine/createWdiEtlEngine";
import type { EtlRunReport } from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/**
 * Runs the World Bank WDI pipeline and returns the run's report.
 *
 * @param options.limit - Process at most this many input CSVs.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  return await createWdiEtlEngine(getPipelineEtlDestination()).run(options);
}

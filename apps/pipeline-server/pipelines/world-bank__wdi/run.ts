import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createWdiEtlEngine } from "@pipelines/world-bank__wdi/createWdiEtlEngine/createWdiEtlEngine";
import type {
  EtlDriveScopes,
  EtlEngineInstance,
  EtlRunReport,
} from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

function _createEngine(): EtlEngineInstance {
  return createWdiEtlEngine(getPipelineEtlDestination());
}

/**
 * Runs the World Bank WDI pipeline and returns the run's report.
 *
 * @param options.limit - Process at most this many input CSVs.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  return await _createEngine().run(options);
}

/**
 * Lists the WDI drive's live scopes, without crawling or needing Supabase
 * credentials.
 */
export async function listScopes(): Promise<readonly EtlDriveScopes[]> {
  return await _createEngine().listScopes();
}

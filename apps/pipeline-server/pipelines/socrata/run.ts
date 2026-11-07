import { fileURLToPath } from "node:url";
import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { getPipelineWorkspaceLoadability } from "@pipelines/shared/getPipelineWorkspaceLoadability/getPipelineWorkspaceLoadability";
import { loadPipelineDefinition } from "@pipelines/shared/loadPipelineDefinition/loadPipelineDefinition";
import { listConfiguredDrives } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { createSocrataEtlEngine } from "@pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine";
import { createSocrataHttpClient } from "@pipelines/socrata/createSocrataHttpClient/createSocrataHttpClient";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient";
import type {
  EtlDriveScopes,
  EtlEngineInstance,
  EtlRunReport,
} from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/** This pipeline's drives and field mappings. */
const SOCRATA_PIPELINE_CONFIG_PATH = fileURLToPath(
  new URL("./socrata.pipeline.yaml", import.meta.url),
);

/**
 * Loads `socrata.pipeline.yaml` once and builds the engine over its drives
 * and field mappings.
 */
async function _createEngine(): Promise<EtlEngineInstance> {
  const { config, mapper } = await loadPipelineDefinition(
    SOCRATA_PIPELINE_CONFIG_PATH,
  );
  const discovery = createSocrataDiscoveryClient(
    createSocrataHttpClient({
      appToken: getOptionalEnvVar("SOCRATA_APP_TOKEN"),
    }),
  );
  return createSocrataEtlEngine({
    ...getPipelineEtlDestination(),
    discovery,
    drives: listConfiguredDrives(config),
    mapper,
    workspaceLoadability: getPipelineWorkspaceLoadability(config),
  });
}

/**
 * Runs the Socrata pipeline over every drive `socrata.pipeline.yaml` lists
 * and returns the run's report. All drives share one rate-limited Discovery
 * API client. Set `SOCRATA_APP_TOKEN` (see `.env.pipelines.example`) for a
 * higher limit.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  const engine = await _createEngine();
  return await engine.run(options);
}

/**
 * Lists every configured Socrata drive's live scopes, without crawling or
 * needing Supabase credentials.
 */
export async function listScopes(): Promise<readonly EtlDriveScopes[]> {
  const engine = await _createEngine();
  return await engine.listScopes();
}

import { fileURLToPath } from "node:url";
import { createGhoEtlEngine } from "@pipelines/gho/createGhoEtlEngine/createGhoEtlEngine";
import { createGhoHttpClient } from "@pipelines/gho/createGhoHttpClient/createGhoHttpClient";
import { GHO_BASE_URL, listGhoDrives } from "@pipelines/gho/ghoDrive/ghoDrive";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { getPipelineWorkspaceLoadability } from "@pipelines/shared/getPipelineWorkspaceLoadability/getPipelineWorkspaceLoadability";
import { loadPipelineDefinition } from "@pipelines/shared/loadPipelineDefinition/loadPipelineDefinition";
import type {
  EtlDriveScopes,
  EtlEngineInstance,
  EtlRunReport,
} from "@avandar/etl";
import type {
  PipelineRunOptions,
  PipelineSupabaseTarget,
} from "@pipelines/shared/PipelineRunOptions.types";

/** This pipeline's drive and field mappings. */
const GHO_PIPELINE_CONFIG_PATH = fileURLToPath(
  new URL("./gho.pipeline.yaml", import.meta.url),
);

/**
 * Loads `gho.pipeline.yaml` once and builds the engine over its drive and
 * field mappings.
 */
async function _createEngine(
  supabase?: PipelineSupabaseTarget,
): Promise<EtlEngineInstance> {
  const { config, mapper } = await loadPipelineDefinition(
    GHO_PIPELINE_CONFIG_PATH,
  );
  return createGhoEtlEngine({
    ...getPipelineEtlDestination({ isRecordingDrives: true, supabase }),
    http: createGhoHttpClient({ baseUrl: GHO_BASE_URL }),
    drives: listGhoDrives(config),
    mapper,
    workspaceLoadability: getPipelineWorkspaceLoadability(config),
  });
}

/**
 * Runs the GHO pipeline over the drive `gho.pipeline.yaml` lists and returns
 * the run's report. GHO needs no API key. GHO lists no modified times, so
 * only full runs are supported.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  const { supabase, ...runOptions } = options;
  const engine = await _createEngine(supabase);
  return await engine.run(runOptions);
}

/**
 * Lists the GHO drive's live scopes, without crawling or needing Supabase
 * credentials. It reads GHO's `$metadata` once, as a run does.
 */
export async function listScopes(): Promise<readonly EtlDriveScopes[]> {
  const engine = await _createEngine();
  return await engine.listScopes();
}

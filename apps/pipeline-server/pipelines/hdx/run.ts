import { fileURLToPath } from "node:url";
import { createHdxEtlEngine } from "@pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine";
import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { HDX_BASE_URL, listHdxDrives } from "@pipelines/hdx/hdxDrive";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { getPipelineWorkspaceLoadability } from "@pipelines/shared/getPipelineWorkspaceLoadability/getPipelineWorkspaceLoadability";
import { loadPipelineDefinition } from "@pipelines/shared/loadPipelineDefinition/loadPipelineDefinition";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
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
const HDX_PIPELINE_CONFIG_PATH = fileURLToPath(
  new URL("./hdx.pipeline.yaml", import.meta.url),
);

/**
 * Loads `hdx.pipeline.yaml` once and builds the engine over its drive and
 * field mappings.
 */
async function _createEngine(
  supabase?: PipelineSupabaseTarget,
): Promise<EtlEngineInstance> {
  const { config, mapper } = await loadPipelineDefinition(
    HDX_PIPELINE_CONFIG_PATH,
  );
  const discovery = createCkanDiscoveryClient(
    createHdxHttpClient({ baseUrl: HDX_BASE_URL }),
  );
  return createHdxEtlEngine({
    ...getPipelineEtlDestination({ isRecordingDrives: true, supabase }),
    discovery,
    drives: listHdxDrives(config),
    mapper,
    workspaceLoadability: getPipelineWorkspaceLoadability(config),
  });
}

/**
 * Runs the HDX pipeline over the drive `hdx.pipeline.yaml` lists and returns
 * the run's report. HDX needs no API key to read.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  const { supabase, ...runOptions } = options;
  const engine = await _createEngine(supabase);
  return await engine.run(runOptions);
}

/**
 * Lists the HDX drive's live scopes, without crawling or needing Supabase
 * credentials.
 */
export async function listScopes(): Promise<readonly EtlDriveScopes[]> {
  const engine = await _createEngine();
  return await engine.listScopes();
}

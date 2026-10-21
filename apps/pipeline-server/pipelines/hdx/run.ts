import { createHdxEtlEngine } from "@pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine";
import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { HDX_BASE_URL } from "@pipelines/hdx/hdxDrive";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
import type {
  EtlDriveScopes,
  EtlEngineInstance,
  EtlRunReport,
} from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

function _createEngine(): EtlEngineInstance {
  const discovery = createCkanDiscoveryClient(
    createHdxHttpClient({ baseUrl: HDX_BASE_URL }),
  );
  return createHdxEtlEngine({ ...getPipelineEtlDestination(), discovery });
}

/**
 * Runs the HDX pipeline over its one drive (`hdxDrive.ts`) and returns the
 * run's report. HDX needs no API key to read.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  return await _createEngine().run(options);
}

/**
 * Lists the HDX drive's live scopes, without crawling or needing Supabase
 * credentials.
 */
export async function listScopes(): Promise<readonly EtlDriveScopes[]> {
  return await _createEngine().listScopes();
}

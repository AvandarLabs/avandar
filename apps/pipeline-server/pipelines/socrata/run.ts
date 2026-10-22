import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createSocrataCsvHeaderReader } from "@pipelines/socrata/createSocrataCsvHeaderReader/createSocrataCsvHeaderReader";
import { createSocrataEtlEngine } from "@pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine";
import { createSocrataHttpClient } from "@pipelines/socrata/createSocrataHttpClient/createSocrataHttpClient";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient";
import type {
  EtlDriveScopes,
  EtlEngineInstance,
  EtlRunReport,
} from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

function _createEngine(): EtlEngineInstance {
  const appToken = getOptionalEnvVar("SOCRATA_APP_TOKEN");
  const discovery = createSocrataDiscoveryClient(
    createSocrataHttpClient({ appToken }),
  );
  return createSocrataEtlEngine({
    ...getPipelineEtlDestination(),
    discovery,
    readCsvHeader: createSocrataCsvHeaderReader({ appToken }),
  });
}

/**
 * Runs the Socrata pipeline over every configured drive and returns the
 * run's report. All drives share one rate-limited Discovery API client. Set
 * `SOCRATA_APP_TOKEN` (see `.env.pipelines.example`) for a higher limit.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  return await _createEngine().run(options);
}

/**
 * Lists every configured Socrata drive's live scopes, without crawling or
 * needing Supabase credentials.
 */
export async function listScopes(): Promise<readonly EtlDriveScopes[]> {
  return await _createEngine().listScopes();
}

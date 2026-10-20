import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import { getPipelineEtlDestination } from "@pipelines/shared/getPipelineEtlDestination/getPipelineEtlDestination";
import { createSocrataEtlEngine } from "@pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine";
import { createSocrataHttpClient } from "@pipelines/socrata/createSocrataHttpClient/createSocrataHttpClient";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient";
import type { EtlRunReport } from "@avandar/etl";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/**
 * Runs the Socrata pipeline over every configured drive and returns the
 * run's report. All drives share one rate-limited Discovery API client. Set
 * `SOCRATA_APP_TOKEN` (see `.env.pipelines.example`) for a higher limit.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<EtlRunReport> {
  const discovery = createSocrataDiscoveryClient(
    createSocrataHttpClient({
      appToken: getOptionalEnvVar("SOCRATA_APP_TOKEN"),
    }),
  );
  return await createSocrataEtlEngine({
    ...getPipelineEtlDestination(),
    discovery,
  }).run(options);
}

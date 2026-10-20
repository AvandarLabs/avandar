import { randomUUID } from "node:crypto";
import { CONFIGURED_DRIVES } from "@pipelines/socrata/configuredDrives/configuredDrives";
import { createSocrataHttpClient } from "@pipelines/socrata/createSocrataHttpClient/createSocrataHttpClient";
import { enumerateSocrataDrive } from "@pipelines/socrata/enumerateSocrataDrive/enumerateSocrataDrive";
import { createSupabaseAdminClient } from "@pipelines/shared/createSupabaseAdminClient";
import { getOptionalEnvVar } from "@pipelines/shared/getOptionalEnvVar/getOptionalEnvVar";
import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { createSocrataDiscoveryClient } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/**
 * Enumerates every configured Socrata drive and upserts one
 * `data_catalog_listings` row per discovered dataset.
 *
 * Each drive is enumerated independently with `Promise.allSettled`: one
 * drive throwing (e.g. a rate limit) is logged and skipped rather than
 * discarding every other drive's already-enumerated rows, so a partial run
 * still upserts what did succeed. Every drive shares one rate-limited client,
 * because they all go through the same Discovery API host. Set
 * `SOCRATA_APP_TOKEN` (see `.env.pipelines.example`) for a higher limit.
 *
 * @param options.limit - Upsert at most this many datasets in total.
 * @returns The pipeline run id.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<string> {
  const { limit } = options;
  const pipelineRunId = randomUUID();
  const supabase = createSupabaseAdminClient();
  const discovery = createSocrataDiscoveryClient(
    createSocrataHttpClient({ appToken: getOptionalEnvVar("SOCRATA_APP_TOKEN") }),
  );

  const results = await Promise.allSettled(
    CONFIGURED_DRIVES.map((drive) => {
      return enumerateSocrataDrive({ drive, discovery, limit });
    }),
  );

  const enumeratedRows: DataCatalogListingRow[] = [];
  results.forEach((result, index) => {
    const drive = CONFIGURED_DRIVES[index];
    if (result.status === "fulfilled") {
      enumeratedRows.push(...result.value);
    } else {
      console.error(
        `[socrata] run ${pipelineRunId}: drive ${drive?.baseUrl ?? "unknown"} failed:`,
        result.reason,
      );
    }
  });
  const rows =
    limit === undefined ? enumeratedRows : enumeratedRows.slice(0, limit);

  console.log(
    `[socrata] run ${pipelineRunId}: discovered ${String(rows.length)} resources across ${String(CONFIGURED_DRIVES.length)} drives`,
  );
  await upsertDataCatalogListingRows({ supabase, rows });

  return pipelineRunId;
}

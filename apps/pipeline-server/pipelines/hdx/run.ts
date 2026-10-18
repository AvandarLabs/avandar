import { randomUUID } from "node:crypto";
import { HDX_DRIVE } from "@pipelines/hdx/hdxDrive";
import { makeCkanListingRowsFromPackage } from "@pipelines/hdx/makeCkanListingRowsFromPackage/makeCkanListingRowsFromPackage";
import { createSupabaseAdminClient } from "@pipelines/shared/createSupabaseAdminClient";
import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
import { HttpClientFactory } from "$/utils/HttpClientFactory/HttpClientFactory";
import { withRateLimit } from "$/utils/HttpClientFactory/mixins/withRateLimit/withRateLimit";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

/** HDX asks API clients to send at most one request per second. */
const MIN_TIME_BETWEEN_REQUESTS_MS = 1000;

/**
 * Enumerates the HDX drive, if one is configured (`hdxDrive.ts`), and
 * upserts one `data_catalog_listings` row per readable resource it finds.
 *
 * Not an `EtlEngine` pipeline: nothing here extracts, transforms, or loads
 * data into Parquet. It only discovers metadata and writes catalog rows -
 * the actual resource bytes are still fetched live on first query, by the
 * existing `acquireOpenDataResourceWithCache` path, completely unchanged.
 */
export async function run(): Promise<string> {
  const pipelineRunId = randomUUID();

  if (HDX_DRIVE === undefined) {
    console.log(`[hdx] run ${pipelineRunId}: no HDX drive configured`);
    return pipelineRunId;
  }

  const supabase = createSupabaseAdminClient();
  const http = HttpClientFactory.create("HdxPipelineHttpClient", {
    state: { maxResponseBytes: MAX_METADATA_BYTES },
    mixins: [withRateLimit({ minTimeMs: MIN_TIME_BETWEEN_REQUESTS_MS })],
  });
  const discovery = createCkanDiscoveryClient(http);
  const client = createCkanClient(http);

  const slugs = await discovery.listDatasets({ baseUrl: HDX_DRIVE.baseUrl });
  const rows: DataCatalogListingRow[] = [];
  // Sequential on purpose: the rate limiter already spaces requests, and an
  // offline batch job gains nothing from racing them.
  for (const slug of slugs) {
    const ckanPackage = await client.getPackage({
      baseUrl: HDX_DRIVE.baseUrl,
      ckanDatasetId: slug,
    });
    rows.push(
      ...makeCkanListingRowsFromPackage({ drive: HDX_DRIVE, ckanPackage }),
    );
  }

  console.log(
    `[hdx] run ${pipelineRunId}: discovered ${String(rows.length)} resources`,
  );
  await upsertDataCatalogListingRows({ supabase, rows });

  return pipelineRunId;
}

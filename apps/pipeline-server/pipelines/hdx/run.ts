import { randomUUID } from "node:crypto";
import { HDX_DRIVE } from "@pipelines/hdx/hdxDrive";
import { makeCkanListingRowsFromPackage } from "@pipelines/hdx/makeCkanListingRowsFromPackage/makeCkanListingRowsFromPackage";
import { createSupabaseAdminClient } from "@pipelines/shared/createSupabaseAdminClient";
import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
import { createOpenDataHttp } from "$/connectors/open-data/createOpenDataHttp";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";

/** Ceiling for a metadata JSON response - never a resource download. */
const MAX_METADATA_BYTES = 10 * 1024 * 1024;

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
  const http = createOpenDataHttp({ maxBytes: MAX_METADATA_BYTES });
  const discovery = createCkanDiscoveryClient(http);
  const client = createCkanClient(http);

  const slugs = await discovery.listDatasets({ baseUrl: HDX_DRIVE.baseUrl });
  const rows: DataCatalogListingRow[] = [];
  // Sequential on purpose: this is an offline batch job, not a user-facing
  // request, and each iteration is independent - no ordering dependency,
  // just no need yet for the added complexity of a concurrency limiter.
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

import { randomUUID } from "node:crypto";
import { createHdxHttpClient } from "@pipelines/hdx/createHdxHttpClient/createHdxHttpClient";
import { HDX_DRIVE } from "@pipelines/hdx/hdxDrive";
import { makeCkanListingRowsFromPackage } from "@pipelines/hdx/makeCkanListingRowsFromPackage/makeCkanListingRowsFromPackage";
import { createSupabaseAdminClient } from "@pipelines/shared/createSupabaseAdminClient";
import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { createCkanClient } from "$/connectors/open-data/CkanClient/CkanClient";
import { createCkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";
import type { PipelineRunOptions } from "@pipelines/shared/PipelineRunOptions.types";

/**
 * Enumerates the HDX drive, if one is configured (`hdxDrive.ts`), and
 * upserts one `data_catalog_listings` row per readable resource it finds.
 *
 * Not an `EtlEngine` pipeline: nothing here extracts, transforms, or loads
 * data into Parquet. It only discovers metadata and writes catalog rows -
 * the actual resource bytes are still fetched live on first query, by the
 * existing `acquireOpenDataResourceWithCache` path, completely unchanged.
 *
 * @param options.limit - Read at most this many datasets. One dataset can
 * produce several rows, one per readable resource.
 * @returns The pipeline run id.
 */
export async function run(
  options: PipelineRunOptions = { mode: "full" },
): Promise<string> {
  const pipelineRunId = randomUUID();

  if (HDX_DRIVE === undefined) {
    console.log(`[hdx] run ${pipelineRunId}: no HDX drive configured`);
    return pipelineRunId;
  }

  const supabase = createSupabaseAdminClient();
  const http = createHdxHttpClient({ baseUrl: HDX_DRIVE.baseUrl });
  const discovery = createCkanDiscoveryClient(http);
  const client = createCkanClient(http);

  const allSlugs = await discovery.listDatasets({ baseUrl: HDX_DRIVE.baseUrl });
  const slugs =
    options.limit === undefined ? allSlugs : allSlugs.slice(0, options.limit);
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

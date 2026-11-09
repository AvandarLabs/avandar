import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { buildParquetCachePartPaths } from "$/connectors/open-data/buildParquetCachePartPath/buildParquetCachePartPath";
import { expect, test } from "./fixtures/e2e.fixture";
import { signInWithEmailPassword } from "./helpers/auth";
import { refreshCatalogFacetCounts } from "./helpers/refreshCatalogFacetCounts";
import { createSupabaseAdminClient } from "./helpers/supabaseAdminClient";
import { LONG_WAIT, MEDIUM_WAIT } from "./helpers/timeouts";
import type { Page } from "@playwright/test";

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/**
 * The pipeline the seeded listing is filed under. Only this spec uses it, so
 * cleaning up by it removes this spec's rows and nothing else, including rows
 * a killed earlier run left behind.
 */
const E2E_PIPELINE_NAME = "e2e-odc-parquet-copy";

/** A made-up word in the seeded listing's name and in no real one. */
const E2E_SEARCH_WORD = "brindlequay";

const E2E_LISTING_NAME = "Brindlequay ferry counts";

/** The public bucket the pipeline server writes Parquet copies to. */
const OPEN_DATA_BUCKET = "opendata";

/**
 * The copy is split into several parts, as the pipeline server splits a
 * large source, so loading it has to read and merge every part in order.
 */
const NUM_PARTS = 3;
const ROWS_PER_PART = 4;
const NUM_ROWS = NUM_PARTS * ROWS_PER_PART;

/**
 * Writes the copy's parts with DuckDB, the engine the pipeline server writes
 * them with. Part `p` holds rows `p * ROWS_PER_PART + 1` onwards, so reading
 * the parts in order gives `row_number` 1 to `NUM_ROWS`.
 */
async function _buildCopyParts(): Promise<Uint8Array[]> {
  const directory = await mkdtemp(join(tmpdir(), "e2e-odc-parquet-copy-"));
  const instance = await DuckDBInstance.create(":memory:");
  const connection = await instance.connect();
  try {
    const parts: Uint8Array[] = [];
    for (let partIndex = 0; partIndex < NUM_PARTS; partIndex += 1) {
      const partPath = join(directory, `part-${partIndex}.parquet`);
      const firstRow = partIndex * ROWS_PER_PART + 1;
      // One connection runs one statement at a time, so parts are written in
      // turn.
      await connection.run(
        `COPY (
          SELECT range::BIGINT AS row_number, 'part ${partIndex}' AS part_label
          FROM range(${firstRow}, ${firstRow + ROWS_PER_PART})
        ) TO '${partPath}' (FORMAT parquet)`,
      );
      parts.push(await readFile(partPath));
    }
    return parts;
  } finally {
    connection.closeSync();
    instance.closeSync();
    await rm(directory, { recursive: true, force: true });
  }
}

/** Removes every object in one `opendata` folder. */
async function _removeCopyFolder(
  admin: AdminClient,
  folderPath: string,
): Promise<void> {
  const { data: objects, error: listError } = await admin.storage
    .from(OPEN_DATA_BUCKET)
    .list(folderPath);
  if (listError) {
    throw new Error(`e2e copy list: ${listError.message}`);
  }
  if (objects.length === 0) {
    return;
  }
  const { error: removeError } = await admin.storage
    .from(OPEN_DATA_BUCKET)
    .remove(
      objects.map((object) => {
        return `${folderPath}/${object.name}`;
      }),
    );
  if (removeError) {
    throw new Error(`e2e copy remove: ${removeError.message}`);
  }
}

/**
 * Deletes everything this spec seeds or creates: the datasets added from its
 * listing, the listing's copy in Storage, and the listing. Deleting a listing
 * deletes its open-data source rows but not the datasets they belong to, so
 * the datasets go first.
 */
async function _deleteFixtures(admin: AdminClient): Promise<void> {
  const { data: listings, error: listingsError } = await admin
    .from("data_catalog_listings")
    .select("id, parquet_cache_folder_path")
    .eq("pipeline_name", E2E_PIPELINE_NAME);
  if (listingsError) {
    throw new Error(`e2e listing read: ${listingsError.message}`);
  }
  if (listings.length === 0) {
    return;
  }
  const listingIds = listings.map((listing) => {
    return listing.id;
  });
  const { data: sources, error: sourcesError } = await admin
    .from("datasets__open_data")
    .select("dataset_id")
    .in("catalog_listing_id", listingIds);
  if (sourcesError) {
    throw new Error(`e2e open-data source read: ${sourcesError.message}`);
  }
  if (sources.length > 0) {
    const { error: datasetsError } = await admin
      .from("datasets")
      .delete()
      .in(
        "id",
        sources.map((source) => {
          return source.dataset_id;
        }),
      );
    if (datasetsError) {
      throw new Error(`e2e dataset delete: ${datasetsError.message}`);
    }
  }
  for (const listing of listings) {
    if (listing.parquet_cache_folder_path !== null) {
      await _removeCopyFolder(admin, listing.parquet_cache_folder_path);
    }
  }
  const { error: deleteError } = await admin
    .from("data_catalog_listings")
    .delete()
    .in("id", listingIds);
  if (deleteError) {
    throw new Error(`e2e listing delete: ${deleteError.message}`);
  }
}

/**
 * Seeds an API-backed Parquet listing whose copy the pipeline server has
 * already built: its parts are in `opendata` and the listing records them.
 * The build itself is the pipeline server's work and is tested there; this
 * spec covers what a user does with a built copy.
 *
 * The listing's host is unreachable on purpose. The edge function's
 * freshness check then fails, and a failed check serves the copy as current,
 * so nothing here reaches a real source.
 */
async function _seedListingWithCopy(admin: AdminClient): Promise<void> {
  const parts = await _buildCopyParts();
  const listingId = crypto.randomUUID();
  const folderPath = `catalog-cache/${listingId}/${crypto.randomUUID()}`;
  const partPaths = buildParquetCachePartPaths({
    folderPath,
    partCount: NUM_PARTS,
  });
  await Promise.all(
    partPaths.map(async (partPath, partIndex) => {
      const { error } = await admin.storage
        .from(OPEN_DATA_BUCKET)
        .upload(partPath, parts[partIndex]!, {
          contentType: "application/vnd.apache.parquet",
          upsert: true,
        });
      if (error) {
        throw new Error(`e2e copy upload: ${error.message}`);
      }
    }),
  );

  const { error: listingError } = await admin
    .from("data_catalog_listings")
    .insert({
      id: listingId,
      access_kind: "api_resource",
      display_name: E2E_LISTING_NAME,
      organization1_name: "E2E Harbor Office",
      pipeline_name: E2E_PIPELINE_NAME,
      pipeline_run_id: "e2e-run",
      api_service: "ckan",
      api_base_url: "https://e2e-odc-parquet-copy.invalid",
      external_dataset_id: "e2e-ferry-counts",
      api_resource_id: "e2e-ferry-counts-parquet",
      api_resource_format: "PARQUET",
      date_column_type_last_verified: new Date().toISOString(),
      parquet_cache_status: "ready",
      parquet_cache_folder_path: folderPath,
      parquet_cache_part_count: NUM_PARTS,
      parquet_cache_source_version: "e2e-version",
      parquet_cache_built_at: new Date().toISOString(),
      parquet_cache_row_count: NUM_ROWS,
      parquet_cache_byte_size: parts.reduce((total, part) => {
        return total + part.byteLength;
      }, 0),
    });
  if (listingError) {
    throw new Error(`e2e listing insert: ${listingError.message}`);
  }
  const { error: columnsError } = await admin
    .from("data_catalog_listings__relation_columns")
    .insert([
      {
        catalog_listing_id: listingId,
        column_name: "row_number",
        display_order: 0,
        original_data_type: "BIGINT",
        cast_data_type: "BIGINT",
      },
      {
        catalog_listing_id: listingId,
        column_name: "part_label",
        display_order: 1,
        original_data_type: "VARCHAR",
        cast_data_type: "VARCHAR",
      },
    ]);
  if (columnsError) {
    throw new Error(`e2e relation columns insert: ${columnsError.message}`);
  }
}

/** Finds the seeded listing in the open data catalog and opens it. */
async function _openSeededListing(
  options: Readonly<{ page: Page; workspaceSlug: string }>,
): Promise<void> {
  const { page, workspaceSlug } = options;
  await page.goto(`/${workspaceSlug}/data-manager/data-import`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("tab", { name: "Open data" }).click();
  await page
    .getByRole("textbox", { name: "Search open data" })
    .fill(E2E_SEARCH_WORD, { timeout: LONG_WAIT });
  await page
    .getByRole("region", { name: "Results" })
    .getByRole("listbox", { name: "Open datasets" })
    .getByRole("option", { name: new RegExp(E2E_LISTING_NAME) })
    .click();
}

/** Every cell of the grid on the page, row by row, as `[row_number, label]`. */
function _expectedCells(): string[] {
  return Array.from({ length: NUM_ROWS }, (_unused, rowIndex) => {
    return [
      String(rowIndex + 1),
      `part ${Math.floor(rowIndex / ROWS_PER_PART)}`,
    ];
  }).flat();
}

test.describe("ODC Parquet copies", () => {
  test("adds an API-backed listing and loads every part of its Parquet copy, in order", async ({
    page,
    e2eWorkerDb,
  }) => {
    const admin = createSupabaseAdminClient();
    // A killed earlier run cannot clean up after itself, so its listing would
    // turn up in this run's search.
    await _deleteFixtures(admin);
    await _seedListingWithCopy(admin);
    await refreshCatalogFacetCounts(admin);

    try {
      await signInWithEmailPassword(page, {
        email: e2eWorkerDb.primaryUser.email,
        password: e2eWorkerDb.primaryUser.password,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });
      await _openSeededListing({
        page,
        workspaceSlug: e2eWorkerDb.workspaceSlug,
      });

      // A Parquet listing previews from its copy's first part.
      await expect(page.getByRole("gridcell").first()).toHaveText("1", {
        timeout: MEDIUM_WAIT,
      });

      await page
        .getByRole("button", { name: "Add dataset to workspace" })
        .click();
      await expect(page.getByText("Dataset added")).toBeVisible({
        timeout: MEDIUM_WAIT,
      });

      await page.getByRole("link", { name: E2E_LISTING_NAME }).click();

      // The count is a COUNT(*) over the loaded data, so it only reaches the
      // total once every part has been read and merged.
      await expect(
        page.getByText(new RegExp(`^Open data.*\\b${NUM_ROWS} rows`)),
      ).toBeVisible({ timeout: LONG_WAIT });
      await expect(page.getByRole("gridcell")).toHaveText(_expectedCells());
      await page.screenshot({
        path: ".temp/test-odc-parquet-copy/dataset-loaded-from-copy.png",
      });
    } finally {
      await _deleteFixtures(admin);
      await refreshCatalogFacetCounts(admin);
    }
  });
});

import { upsertCatalogListingRows } from "@pipelines/open-data-catalog-listings/upsertCatalogListingRows/upsertCatalogListingRows";
import { describe, expect, it, vi } from "vitest";
import type { CatalogListingRow } from "@pipelines/open-data-catalog-listings/CatalogListingRow.types";

const ROW: CatalogListingRow = {
  access_kind: "api_resource",
  api_service: "ckan",
  api_base_url: "https://data.humdata.org",
  external_dataset_id: "movement-range-maps",
  api_resource_id: "csv-1",
  api_resource_format: "CSV",
  display_name: "data.csv",
  external_organization_name: "Humanitarian Data Exchange",
};

function _fakeSupabase(
  overrides: { upsertResult?: { error: { message: string } | null } } = {},
) {
  const upsert = vi.fn(async () => {
    return overrides.upsertResult ?? { error: null };
  });
  const client = {
    from: vi.fn(() => {
      return { upsert };
    }),
  };
  return { client, upsert };
}

describe("upsertCatalogListingRows", () => {
  it("does nothing when there are no rows", async () => {
    const { client, upsert } = _fakeSupabase();

    await upsertCatalogListingRows({ supabase: client, rows: [] });

    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts every row against the api_resource unique index", async () => {
    const { client, upsert } = _fakeSupabase();

    await upsertCatalogListingRows({ supabase: client, rows: [ROW] });

    expect(client.from).toHaveBeenCalledWith("catalog_listings__open_data");
    expect(upsert).toHaveBeenCalledWith([ROW], {
      onConflict:
        "api_service,api_base_url,external_dataset_id,api_resource_id",
    });
  });

  it("throws with the upstream message when the upsert fails", async () => {
    const { client } = _fakeSupabase({
      upsertResult: { error: { message: "constraint violation" } },
    });

    await expect(
      upsertCatalogListingRows({ supabase: client, rows: [ROW] }),
    ).rejects.toThrow("constraint violation");
  });
});

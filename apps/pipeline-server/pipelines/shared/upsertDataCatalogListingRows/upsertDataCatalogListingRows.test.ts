import { upsertDataCatalogListingRows } from "@pipelines/shared/upsertDataCatalogListingRows/upsertDataCatalogListingRows";
import { describe, expect, it, vi } from "vitest";
import type { DataCatalogListingRow } from "@pipelines/shared/DataCatalogListingRow.types";

const ROW: DataCatalogListingRow = {
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

describe("upsertDataCatalogListingRows", () => {
  it("does nothing when there are no rows", async () => {
    const { client, upsert } = _fakeSupabase();

    await upsertDataCatalogListingRows({ supabase: client, rows: [] });

    expect(upsert).not.toHaveBeenCalled();
  });

  it("upserts every row against the api_resource unique index", async () => {
    const { client, upsert } = _fakeSupabase();

    await upsertDataCatalogListingRows({ supabase: client, rows: [ROW] });

    expect(client.from).toHaveBeenCalledWith("data_catalog_listings");
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
      upsertDataCatalogListingRows({ supabase: client, rows: [ROW] }),
    ).rejects.toThrow("constraint violation");
  });
});

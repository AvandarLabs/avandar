import { createSupabaseListingsStore } from "@etl/stores/SupabaseListingsStore/createSupabaseListingsStore";
import { describe, expect, it } from "vitest";
import type {
  ListingRowValues,
  ListingsStore,
} from "@etl/stores/EtlStores.types";
import type { SupabaseClient } from "@supabase/supabase-js";

const LISTINGS_TABLE = "etl_fixture_listings";

type _FakeQuery = Promise<{ data: unknown[]; error: null }> &
  Readonly<{
    select: () => _FakeQuery;
    eq: () => _FakeQuery;
    in: () => _FakeQuery;
  }>;

const ROW: ListingRowValues = {
  access_kind: "api_resource",
  pipeline_name: "etl-fixture",
  pipeline_run_id: "run-1",
  display_name: "Fixture dataset",
  external_organization_name: "Fixture Org",
  external_dataset_id: "etl-fixture-dataset",
  date_of_last_update: null,
  date_of_last_sync: "2026-10-20T00:00:00.000Z",
  external_service_name: null,
  source_url: null,
  canonical_urls: null,
  license: null,
  update_frequency: null,
  description: null,
  notes: null,
  metadata: null,
  coverage_start_date: null,
  coverage_end_date: null,
  api_service: "ckan",
  api_base_url: "https://etl-fixture.invalid",
  api_resource_id: "etl-fixture-resource",
  api_resource_format: "CSV",
  parquet_file_name: null,
  pipeline_scope_keys: ["all"],
};

/** A client whose every read returns `rowCount` rows that match nothing. */
function _createClientReturningRows(rowCount: number): SupabaseClient {
  const query: _FakeQuery = Object.assign(
    Promise.resolve({
      data: Array.from({ length: rowCount }, (_, index) => {
        return { id: `etl-fixture-${index}` };
      }),
      error: null,
    }),
    {
      select: () => {
        return query;
      },
      eq: () => {
        return query;
      },
      in: () => {
        return query;
      },
    },
  );
  // Only the query chain a read uses is faked. A partial object cannot meet
  // SupabaseClient's full type, so the cast goes through `unknown`.
  return {
    from: () => {
      return query;
    },
  } as unknown as SupabaseClient;
}

function _createStore(rowCount: number): ListingsStore {
  return createSupabaseListingsStore({
    client: _createClientReturningRows(rowCount),
    listingsTable: LISTINGS_TABLE,
    relationColumnsTable: "etl_fixture_columns",
  });
}

describe("createSupabaseListingsStore", () => {
  it("rejects a read that reaches PostgREST's row cap, naming the table", async () => {
    await expect(_createStore(1000).readRowsMatching([ROW])).rejects.toThrow(
      `Reading rows from ${LISTINGS_TABLE} returned 1000 rows`,
    );
  });

  it("accepts a read one row under PostgREST's row cap", async () => {
    await expect(_createStore(999).readRowsMatching([ROW])).resolves.toEqual(
      [],
    );
  });
});

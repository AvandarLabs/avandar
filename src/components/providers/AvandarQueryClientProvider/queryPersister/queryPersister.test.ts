import { QueryClient, dehydrate } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { cleanup, render } from "@testing-library/react";
import { del, set } from "idb-keyval";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import {
  makeCacheBuster,
  queryPersister,
} from "@/components/providers/AvandarQueryClientProvider/queryPersister/queryPersister";
import type { User } from "$/models/User/User";

/**
 * Persists `data` under `queryKey` with an older cache schema version, then
 * restores the cache with the current buster and returns what survived.
 */
async function _restorePersistedQueryData(options: {
  cacheSchemaVersion: string;
  queryKey: readonly unknown[];
  data: unknown;
}): Promise<unknown> {
  const oldClient = new QueryClient();
  const restoredClient = new QueryClient();
  oldClient.setQueryData(options.queryKey, options.data);
  const storageKey = "avandar-react-query-cache";
  try {
    await set(
      storageKey,
      JSON.stringify({
        timestamp: Date.now(),
        buster: `${options.cacheSchemaVersion}:${import.meta.env.VITE_APP_VERSION ?? "dev"}:anon`,
        clientState: dehydrate(oldClient),
      }),
    );
    await new Promise<void>((onSuccess) => {
      render(
        createElement(PersistQueryClientProvider, {
          client: restoredClient,
          persistOptions: {
            persister: queryPersister,
            buster: makeCacheBuster(undefined),
          },
          onSuccess,
        }),
      );
    });
    return restoredClient.getQueryData(options.queryKey);
  } finally {
    cleanup();
    await del(storageKey);
    oldClient.clear();
    restoredClient.clear();
  }
}

describe("makeCacheBuster", () => {
  it("includes user id in the buster", () => {
    expect(makeCacheBuster("user-123" as User.Id)).toContain("user-123");
  });

  it("uses anon when user id is undefined", () => {
    expect(makeCacheBuster(undefined)).toContain("anon");
  });

  it("discards cached query results from before execution SQL was recorded", async () => {
    const queryKey = ["query-results", "SELECT revenue FROM sales"];
    const restoredData = await _restorePersistedQueryData({
      cacheSchemaVersion: "v8",
      queryKey,
      data: {
        ...QueryResult.makeEmpty(),
        columns: [{ name: "revenue", dataType: "double" }],
        data: [{ revenue: 12 }],
        numRows: 1,
      },
    });
    expect(restoredData).toBeUndefined();
  });

  it("discards a catalog preview saved when date columns were a Set", async () => {
    const restoredData = await _restorePersistedQueryData({
      cacheSchemaVersion: "v10",
      queryKey: ["data-catalog-listing-preview", { id: "borough-boundaries" }],
      data: {
        columnNames: ["boro_name"],
        // JSON.stringify(new Set()) is {}. That object has no `.has`, so the
        // grid crashed when the listing was opened again.
        dateColumnNames: {},
        rows: [{ boro_name: "Bronx" }],
      },
    });
    expect(restoredData).toBeUndefined();
  });

  it("discards cached catalog facets from before keywords were counted", async () => {
    const queryKey = [
      "DataCatalogListingClient",
      "searchFacets",
      { query: "", filters: {} },
    ];
    const restoredData = await _restorePersistedQueryData({
      cacheSchemaVersion: "v9",
      queryKey,
      data: {
        sources: [],
        organization2: [],
        organization2Labels: [],
        domains: [],
        formats: [],
        updatedWithin: { any: 0, pastMonth: 0, pastYear: 0, overAYear: 0 },
        numUnloadable: 0,
        numCatalogListings: 0,
      },
    });
    expect(restoredData).toBeUndefined();
  });
});

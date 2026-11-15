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

describe("makeCacheBuster", () => {
  it("includes user id in the buster", () => {
    expect(makeCacheBuster("user-123" as User.Id)).toContain("user-123");
  });

  it("uses anon when user id is undefined", () => {
    expect(makeCacheBuster(undefined)).toContain("anon");
  });

  it("discards cached query results from before execution SQL was recorded", async () => {
    const oldClient = new QueryClient();
    const restoredClient = new QueryClient();
    const queryKey = ["query-results", "SELECT revenue FROM sales"];
    oldClient.setQueryData(queryKey, {
      ...QueryResult.makeEmpty(),
      columns: [{ name: "revenue", dataType: "double" }],
      data: [{ revenue: 12 }],
      numRows: 1,
    });
    const storageKey = "avandar-react-query-cache";
    try {
      await set(
        storageKey,
        JSON.stringify({
          timestamp: Date.now(),
          buster: `v8:${import.meta.env.VITE_APP_VERSION ?? "dev"}:anon`,
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
      expect(restoredClient.getQueryData(queryKey)).toBeUndefined();
    } finally {
      cleanup();
      await del(storageKey);
      oldClient.clear();
      restoredClient.clear();
    }
  });
});

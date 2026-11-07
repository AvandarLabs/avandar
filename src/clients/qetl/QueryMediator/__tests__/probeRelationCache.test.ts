/**
 * Characterization tests for `probeRelationCache` in `getRelationSources.ts`.
 * Split out from `getRelationSources.characterization.test.ts`: this suite
 * never touches that file's per-source-type client mocks, only the DuckDB
 * table listing and the queryable-column memory.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const MISSING_ID = "66666666-6666-4666-8666-666666666666" as Dataset.Id;
const LOADED_ID = "77777777-7777-4777-8777-777777777777" as Dataset.Id;

const { getTableOrViewNamesMock } = vi.hoisted(() => {
  return { getTableOrViewNamesMock: vi.fn() };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return { DuckDbClient: { getTableOrViewNames: getTableOrViewNamesMock } };
});

beforeEach(() => {
  vi.clearAllMocks();
  QueryableRelationColumns.clear();
  getTableOrViewNamesMock.mockResolvedValue([]);
});

describe("probeRelationCache", () => {
  it("returns an empty array without calling any client for an empty request", async () => {
    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");

    const result = await probeRelationCache([]);

    expect(result).toEqual([]);
    expect(getTableOrViewNamesMock).not.toHaveBeenCalled();
  });

  it("returns only the dependencies not already loaded as DuckDB tables", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);

    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await probeRelationCache([LOADED_ID, MISSING_ID]);

    expect(result).toEqual([MISSING_ID]);
  });

  it("treats a present table as a miss when its loaded columns do not cover the request", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);
    QueryableRelationColumns.remember({
      datasetId: LOADED_ID,
      columns: ["a"],
      staleAt: undefined,
    });

    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await probeRelationCache([LOADED_ID], {
      [LOADED_ID]: ["a", "b"],
    });

    expect(result).toEqual([LOADED_ID]);
  });

  it("still serves a present table whose loaded columns cover the request", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);
    QueryableRelationColumns.remember({
      datasetId: LOADED_ID,
      columns: ["a", "b"],
      staleAt: undefined,
    });

    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await probeRelationCache([LOADED_ID], {
      [LOADED_ID]: ["a"],
    });

    expect(result).toEqual([]);
  });

  it("treats a loaded table as a miss once its stale-at time has passed, so a live source is acquired again", async () => {
    getTableOrViewNamesMock.mockResolvedValue([LOADED_ID]);
    QueryableRelationColumns.remember({
      datasetId: LOADED_ID,
      columns: "all",
      staleAt: Date.now() - 1,
    });

    const { probeRelationCache } =
      await import("@/clients/qetl/QueryMediator/getRelationSources");
    const result = await probeRelationCache([LOADED_ID]);

    expect(result).toEqual([LOADED_ID]);
  });
});

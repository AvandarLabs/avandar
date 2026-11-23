/** Pins the in-memory record of which columns DuckDB currently holds. */

import { beforeEach, describe, expect, it } from "vitest";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;

describe("QueryableRelationColumns", () => {
  beforeEach(() => {
    QueryableRelationColumns.clear();
  });

  it("remembers a finite set until forgotten", () => {
    QueryableRelationColumns.remember({
      datasetId: DATASET_ID,
      columns: ["a", "b"],
      staleAt: undefined,
    });
    expect(QueryableRelationColumns.getColumns(DATASET_ID)).toEqual(["a", "b"]);
    QueryableRelationColumns.forget(DATASET_ID);
    expect(QueryableRelationColumns.getColumns(DATASET_ID)).toBeUndefined();
  });

  it("remembers 'all'", () => {
    QueryableRelationColumns.remember({
      datasetId: DATASET_ID,
      columns: "all",
      staleAt: undefined,
    });
    expect(QueryableRelationColumns.getColumns(DATASET_ID)).toBe("all");
  });

  it("reports a loaded relation stale once its stale-at time has passed", () => {
    QueryableRelationColumns.remember({
      datasetId: DATASET_ID,
      columns: "all",
      staleAt: 1_000,
    });
    expect(
      QueryableRelationColumns.isStale({ datasetId: DATASET_ID, now: 999 }),
    ).toBe(false);
    expect(
      QueryableRelationColumns.isStale({ datasetId: DATASET_ID, now: 1_000 }),
    ).toBe(true);
  });

  it("never reports a relation stale when it has no stale-at time", () => {
    QueryableRelationColumns.remember({
      datasetId: DATASET_ID,
      columns: "all",
      staleAt: undefined,
    });
    expect(
      QueryableRelationColumns.isStale({
        datasetId: DATASET_ID,
        now: Number.MAX_SAFE_INTEGER,
      }),
    ).toBe(false);
  });
});

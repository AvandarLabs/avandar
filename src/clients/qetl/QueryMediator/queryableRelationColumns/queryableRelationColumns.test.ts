/** Pins the in-memory record of which columns DuckDB currently holds. */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearQueryableRelationColumns,
  forgetQueryableColumns,
  getQueryableColumns,
  isQueryableRelationStale,
  rememberQueryableColumns,
} from "@/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;

describe("queryableRelationColumns", () => {
  beforeEach(() => {
    clearQueryableRelationColumns();
  });

  it("remembers a finite set until forgotten", () => {
    rememberQueryableColumns({
      datasetId: DATASET_ID,
      columns: ["a", "b"],
      staleAt: undefined,
    });
    expect(getQueryableColumns(DATASET_ID)).toEqual(["a", "b"]);
    forgetQueryableColumns(DATASET_ID);
    expect(getQueryableColumns(DATASET_ID)).toBeUndefined();
  });

  it("remembers 'all'", () => {
    rememberQueryableColumns({
      datasetId: DATASET_ID,
      columns: "all",
      staleAt: undefined,
    });
    expect(getQueryableColumns(DATASET_ID)).toBe("all");
  });

  it("reports a loaded relation stale once its stale-at time has passed", () => {
    rememberQueryableColumns({
      datasetId: DATASET_ID,
      columns: "all",
      staleAt: 1_000,
    });
    expect(isQueryableRelationStale(DATASET_ID, 999)).toBe(false);
    expect(isQueryableRelationStale(DATASET_ID, 1_000)).toBe(true);
  });

  it("never reports a relation stale when it has no stale-at time", () => {
    rememberQueryableColumns({
      datasetId: DATASET_ID,
      columns: "all",
      staleAt: undefined,
    });
    expect(isQueryableRelationStale(DATASET_ID, Number.MAX_SAFE_INTEGER)).toBe(
      false,
    );
  });
});

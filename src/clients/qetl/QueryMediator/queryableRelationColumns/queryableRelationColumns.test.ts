/** Pins the in-memory record of which columns DuckDB currently holds. */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearQueryableRelationColumns,
  forgetQueryableColumns,
  getQueryableColumns,
  rememberQueryableColumns,
} from "@/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;

describe("queryableRelationColumns", () => {
  beforeEach(() => {
    clearQueryableRelationColumns();
  });

  it("remembers a finite set until forgotten", () => {
    rememberQueryableColumns(DATASET_ID, ["a", "b"]);
    expect(getQueryableColumns(DATASET_ID)).toEqual(["a", "b"]);
    forgetQueryableColumns(DATASET_ID);
    expect(getQueryableColumns(DATASET_ID)).toBeUndefined();
  });

  it("remembers 'all'", () => {
    rememberQueryableColumns(DATASET_ID, "all");
    expect(getQueryableColumns(DATASET_ID)).toBe("all");
  });
});

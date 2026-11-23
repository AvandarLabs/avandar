import { objectEntries } from "@avandar/utils";
import { describe, expect, it } from "vitest";
import { getDatasetRefreshFromSourceType } from "@/views/DataManagerApp/DatasetMetaView/getDatasetRefreshFromSourceType/getDatasetRefreshFromSourceType";
import type { DatasetSource } from "$/models/datasets/DatasetSource/DatasetSource";
import type { DatasetRefresh } from "@/views/DataManagerApp/DatasetMetaView/getDatasetRefreshFromSourceType/getDatasetRefreshFromSourceType";

/**
 * The refresh each source type should offer. A live source, read from where
 * it lives each time it goes stale, offers the one that re-reads that source;
 * every other source type offers none. A `Record`, so a new source type
 * fails to compile until it is listed here.
 */
const EXPECTED_REFRESH_BY_SOURCE_TYPE: Record<
  DatasetSource.SourceType,
  DatasetRefresh | undefined
> = {
  csv_file: undefined,
  xlsx_file: undefined,
  pdf_file: undefined,
  open_data: undefined,
  virtual: undefined,
  google_sheets: "google_sheets",
  postgres_table: "postgres_table",
};

const REFRESH_CASES = objectEntries(EXPECTED_REFRESH_BY_SOURCE_TYPE).map(
  ([sourceType, expectedRefresh]) => {
    return {
      sourceType,
      expectedRefresh,
      refreshName: expectedRefresh ?? "no",
    };
  },
);

describe("getDatasetRefreshFromSourceType", () => {
  it.each(REFRESH_CASES)(
    "offers a $sourceType dataset $refreshName refresh",
    ({ sourceType, expectedRefresh }) => {
      expect(getDatasetRefreshFromSourceType(sourceType)).toBe(expectedRefresh);
    },
  );
});

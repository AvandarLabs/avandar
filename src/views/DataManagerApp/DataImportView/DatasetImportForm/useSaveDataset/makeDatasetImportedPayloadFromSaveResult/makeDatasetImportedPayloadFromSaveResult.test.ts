import { describe, expect, it } from "vitest";
import { makeDatasetImportedPayloadFromSaveResult } from "./makeDatasetImportedPayloadFromSaveResult";

describe("makeDatasetImportedPayloadFromSaveResult", () => {
  it.each([
    {
      datasetId: "dataset-1",
      source: {
        sourceType: "csv_file" as const,
        datasetLoadResult: { numRows: 12, columns: [{}, {}, {}] },
      },
      isFirstInWorkspace: true,
      expected: {
        datasetId: "dataset-1",
        sourceType: "csv_file",
        columnCount: 3,
        rowCount: 12,
        isFirstInWorkspace: true,
      },
    },
    {
      datasetId: "dataset-2",
      source: {
        sourceType: "xlsx_file" as const,
        datasetLoadResult: { numRows: 20, columns: [{}, {}] },
      },
      isFirstInWorkspace: false,
      expected: {
        datasetId: "dataset-2",
        sourceType: "xlsx_file",
        columnCount: 2,
        rowCount: 20,
        isFirstInWorkspace: false,
      },
    },
  ])("derives $source.sourceType dimensions", (fixture) => {
    expect(
      makeDatasetImportedPayloadFromSaveResult({
        datasetId: fixture.datasetId,
        source: fixture.source,
        isFirstInWorkspace: fixture.isFirstInWorkspace,
      }),
    ).toEqual(fixture.expected);
  });

  it("reads Google Sheets columns from the load result", () => {
    expect(
      makeDatasetImportedPayloadFromSaveResult({
        datasetId: "dataset-3",
        source: {
          sourceType: "google_sheets",
          datasetLoadResult: { numRows: 7, columns: [{}, {}, {}, {}] },
        },
        isFirstInWorkspace: false,
      }),
    ).toEqual({
      datasetId: "dataset-3",
      sourceType: "google_sheets",
      columnCount: 4,
      rowCount: 7,
      isFirstInWorkspace: false,
    });
  });
});

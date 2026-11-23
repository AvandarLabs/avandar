import { createGhoListingDownload } from "@pipelines/gho/download/createGhoListingDownload/createGhoListingDownload";
import { describe, expect, it } from "vitest";

const BASE_URL = "https://ghoapi.azureedge.net/api";

function _listing(apiResourceId: string) {
  return {
    id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
    apiBaseUrl: BASE_URL,
    apiResourceId,
    externalDatasetId: apiResourceId,
    apiResourceFormat: "ODATA",
  };
}

describe("createGhoListingDownload", () => {
  it("downloads an indicator whole as JSON, read with GHO's fact columns", async () => {
    const download = await createGhoListingDownload()({
      listing: _listing("WHS3_62"),
    });

    expect(download).toMatchObject({
      paging: false,
      url: `${BASE_URL}/WHS3_62`,
      contentKind: "json",
      recordsField: "value",
      sourceVersion: undefined,
    });
    expect(
      download.paging === false && download.contentKind === "json"
        ? download.columns.find((column) => {
            return column.name === "Date";
          })
        : undefined,
    ).toEqual({ name: "Date", dataType: "TIMESTAMP" });
  });

  it("downloads a dimension's value list with its six text columns", async () => {
    const download = await createGhoListingDownload()({
      listing: _listing("DIMENSION/COUNTRY/DimensionValues"),
    });

    expect(download).toEqual({
      paging: false,
      url: `${BASE_URL}/DIMENSION/COUNTRY/DimensionValues`,
      contentKind: "json",
      recordsField: "value",
      columns: [
        { name: "Code", dataType: "VARCHAR" },
        { name: "Title", dataType: "VARCHAR" },
        { name: "Dimension", dataType: "VARCHAR" },
        { name: "ParentDimension", dataType: "VARCHAR" },
        { name: "ParentCode", dataType: "VARCHAR" },
        { name: "ParentTitle", dataType: "VARCHAR" },
      ],
      sourceVersion: undefined,
    });
  });
});

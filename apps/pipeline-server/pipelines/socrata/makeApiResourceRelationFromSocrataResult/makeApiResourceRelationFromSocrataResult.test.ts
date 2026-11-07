import { makeApiResourceRelationFromSocrataResult } from "@pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult";
import { describe, expect, it } from "vitest";
import type {
  SocrataDiscoveryColumn,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";

const DRIVE = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationLabels: { 1: "City" },
};

const RESULT: SocrataDiscoveryResult = {
  sourceRecord: {},
  datasetId: "erm2-nwe9",
  name: "311 Service Requests",
  domain: "data.cityofnewyork.us",
  createdAt: "2011-10-10T00:00:00.000Z",
  updatedAt: "2026-10-19T08:30:00.000Z",
  assetType: "dataset",
  blobMimeType: undefined,
  columns: [],
};

function _make(
  columns: SocrataDiscoveryColumn[],
  overrides: Partial<SocrataDiscoveryResult> = {},
) {
  return makeApiResourceRelationFromSocrataResult({
    drive: DRIVE,
    result: { ...RESULT, columns, ...overrides },
    mappedFields: { organization1Name: "City of New York" },
  });
}

function _column(fieldName: string, dataType: string): SocrataDiscoveryColumn {
  return { fieldName, name: fieldName.toUpperCase(), dataType };
}

describe("makeApiResourceRelationFromSocrataResult", () => {
  it("builds one CSV relation per dataset, dated by its updatedAt", () => {
    expect(_make([_column("unique_key", "Text")])).toEqual({
      kind: "api_resource",
      externalDatasetId: "erm2-nwe9",
      apiResourceId: "erm2-nwe9",
      apiResourceFormat: "CSV",
      displayName: "311 Service Requests",
      organization1Name: "City of New York",
      sourceMetadata: {},
      sourceUpdatedAt: new Date("2026-10-19T08:30:00.000Z"),
      sourceAssetType: "dataset",
      sourceUrl: "https://data.cityofnewyork.us/d/erm2-nwe9",
      sourceDownloadUrl:
        "https://data.cityofnewyork.us/api/views/erm2-nwe9/rows.csv?accessType=DOWNLOAD",
      columns: [
        {
          name: "unique_key",
          originalDataType: "Text",
          castDataType: "VARCHAR",
        },
      ],
    });
  });

  it("names each column by its API field name, which the CSV export's header uses", () => {
    expect(
      _make([
        { fieldName: "created_date", name: "Created Date", dataType: "Text" },
      ]).columns.map((column) => {
        return column.name;
      }),
    ).toEqual(["created_date"]);
  });

  it("reads every column as text, keeping Socrata's type label", () => {
    expect(
      _make([_column("amount", "Number"), _column("opened", "Calendar date")])
        .columns,
    ).toEqual([
      { name: "amount", originalDataType: "Number", castDataType: "VARCHAR" },
      {
        name: "opened",
        originalDataType: "Calendar date",
        castDataType: "VARCHAR",
      },
    ]);
  });

  it("leaves the column types unverified", () => {
    expect(_make([_column("amount", "Number")]).columnTypesVerifiedAt).toBe(
      undefined,
    );
  });

  it("leaves out computed region columns, which the CSV export does not have", () => {
    expect(
      _make([
        _column("borough", "Text"),
        _column(":@computed_region_92fq_4b7q", "Number"),
      ]).columns.map((column) => {
        return column.name;
      }),
    ).toEqual(["borough"]);
  });

  it("marks a dataset with no exportable columns unloadable, with no columns", () => {
    const relation = _make([_column(":@computed_region_92fq_4b7q", "Number")]);

    expect([relation.isWorkspaceLoadable, relation.columns]).toEqual([
      false,
      [],
    ]);
  });

  it("reads a filtered view as CSV, like a dataset", () => {
    const relation = _make([_column("borough", "Text")], {
      assetType: "filter",
    });

    expect([
      relation.apiResourceFormat,
      relation.isWorkspaceLoadable,
      relation.sourceAssetType,
    ]).toEqual(["CSV", undefined, "filter"]);
  });

  it("lists a map as unloadable, with no format and no download", () => {
    const relation = _make([], { assetType: "map" });

    expect({
      apiResourceFormat: relation.apiResourceFormat,
      isWorkspaceLoadable: relation.isWorkspaceLoadable,
      sourceAssetType: relation.sourceAssetType,
      sourceUrl: relation.sourceUrl,
      sourceDownloadUrl: relation.sourceDownloadUrl,
      columns: relation.columns,
    }).toEqual({
      apiResourceFormat: undefined,
      isWorkspaceLoadable: false,
      sourceAssetType: "map",
      sourceUrl: "https://data.cityofnewyork.us/d/erm2-nwe9",
      sourceDownloadUrl: undefined,
      columns: [],
    });
  });

  it("lists a file by the format of its MIME type, with its download URL", () => {
    const relation = _make([], {
      assetType: "file",
      blobMimeType: "application/pdf",
    });

    expect([
      relation.apiResourceFormat,
      relation.isWorkspaceLoadable,
      relation.sourceDownloadUrl,
    ]).toEqual([
      "PDF",
      false,
      "https://data.cityofnewyork.us/download/erm2-nwe9/application%2Fpdf",
    ]);
  });

  it("ignores MIME type parameters and spelling variants", () => {
    const formats = [
      "application/zip; charset=binary",
      "application/x-zip-compressed",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/octet-stream",
    ].map((blobMimeType) => {
      return _make([], { assetType: "file", blobMimeType }).apiResourceFormat;
    });

    expect(formats).toEqual(["ZIP", "ZIP", "XLSX", "CSV", undefined]);
  });

  it("never marks a file loadable, since only a dataset's CSV export is read", () => {
    const relation = _make([], {
      assetType: "file",
      blobMimeType: "text/csv",
    });

    expect(relation.isWorkspaceLoadable).toBe(false);
  });

  it("spreads the mapped fields and keeps the raw record", () => {
    const relation = makeApiResourceRelationFromSocrataResult({
      drive: {
        baseUrl: "https://data.cityofnewyork.us",
        organizationLabels: {},
      },
      result: {
        ...RESULT,
        sourceRecord: { resource: { id: RESULT.datasetId } },
      },
      mappedFields: {
        organization1Name: "City of New York",
        organization2Name: "TLC",
        tags: ["fhv"],
      },
    });

    expect(relation).toMatchObject({
      organization1Name: "City of New York",
      organization2Name: "TLC",
      tags: ["fhv"],
      sourceMetadata: { resource: { id: RESULT.datasetId } },
    });
  });
});

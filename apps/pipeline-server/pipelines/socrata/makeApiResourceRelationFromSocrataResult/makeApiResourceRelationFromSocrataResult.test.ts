import { makeApiResourceRelationFromSocrataResult } from "@pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult";
import { describe, expect, it } from "vitest";
import type { SocrataDiscoveryColumn } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";

const DRIVE = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "City of New York",
};

function _make(columns: SocrataDiscoveryColumn[]) {
  return makeApiResourceRelationFromSocrataResult({
    drive: DRIVE,
    result: {
      datasetId: "erm2-nwe9",
      name: "311 Service Requests",
      domain: "data.cityofnewyork.us",
      createdAt: "2011-10-10T00:00:00.000Z",
      updatedAt: "2026-10-19T08:30:00.000Z",
      columns,
    },
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
      externalOrganizationName: "City of New York",
      sourceUpdatedAt: new Date("2026-10-19T08:30:00.000Z"),
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
      ])?.columns.map((column) => {
        return column.name;
      }),
    ).toEqual(["created_date"]);
  });

  it("reads every column as text, keeping Socrata's type label", () => {
    expect(
      _make([_column("amount", "Number"), _column("opened", "Calendar date")])
        ?.columns,
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
    expect(_make([_column("amount", "Number")])?.columnTypesVerifiedAt).toBe(
      undefined,
    );
  });

  it("leaves out computed region columns, which the CSV export does not have", () => {
    expect(
      _make([
        _column("borough", "Text"),
        _column(":@computed_region_92fq_4b7q", "Number"),
      ])?.columns.map((column) => {
        return column.name;
      }),
    ).toEqual(["borough"]);
  });

  it("builds no relation for a dataset with no exportable columns", () => {
    expect(_make([_column(":@computed_region_92fq_4b7q", "Number")])).toBe(
      undefined,
    );
  });
});

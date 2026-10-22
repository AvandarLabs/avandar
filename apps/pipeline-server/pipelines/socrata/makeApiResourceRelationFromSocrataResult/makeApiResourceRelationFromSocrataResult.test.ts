import { makeApiResourceRelationFromSocrataResult } from "@pipelines/socrata/makeApiResourceRelationFromSocrataResult/makeApiResourceRelationFromSocrataResult";
import { describe, expect, it } from "vitest";
import type { SocrataDiscoveryColumn } from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";

const DRIVE = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "City of New York",
};

/**
 * Builds the relation for a dataset with `columns`. Its CSV header is
 * `csvHeader` when given, even as `undefined`, and otherwise the columns'
 * field names without system fields.
 */
function _make(
  columns: SocrataDiscoveryColumn[],
  ...csvHeaderArgument: [csvHeader?: readonly string[] | undefined]
) {
  const csvHeader =
    csvHeaderArgument.length > 0
      ? csvHeaderArgument[0]
      : columns.flatMap((column) => {
          return column.fieldName.startsWith(":") ? [] : [column.fieldName];
        });
  return makeApiResourceRelationFromSocrataResult({
    drive: DRIVE,
    result: {
      datasetId: "erm2-nwe9",
      name: "311 Service Requests",
      domain: "data.cityofnewyork.us",
      createdAt: "2011-10-10T00:00:00.000Z",
      updatedAt: "2026-10-19T08:30:00.000Z",
      columns,
      csvHeader,
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

  it.each([
    ["Text", "VARCHAR"],
    ["Number", "DOUBLE"],
    ["Money", "DOUBLE"],
    ["Percent", "DOUBLE"],
    ["Calendar date", "TIMESTAMP"],
    ["Floating Timestamp", "TIMESTAMP"],
    ["Fixed Timestamp", "TIMESTAMP"],
    ["Date", "TIMESTAMP"],
    ["Checkbox", "BOOLEAN"],
    ["Point", "VARCHAR"],
    ["URL", "VARCHAR"],
    ["Something new", "VARCHAR"],
  ])("casts a %s column to %s", (dataType, castDataType) => {
    expect(_make([_column("value", dataType)])?.columns).toEqual([
      { name: "value", originalDataType: dataType, castDataType },
    ]);
  });

  it("names and orders the columns by the CSV header, not the Discovery API", () => {
    expect(
      _make(
        [
          _column("location_address", "Text"),
          _column("location", "Point"),
          _column("borough", "Text"),
          _column(":@computed_region_92fq_4b7q", "Number"),
        ],
        ["borough", "location"],
      )?.columns,
    ).toEqual([
      { name: "borough", originalDataType: "Text", castDataType: "VARCHAR" },
      { name: "location", originalDataType: "Point", castDataType: "VARCHAR" },
    ]);
  });

  it("reads a header column the Discovery API does not list as text", () => {
    expect(_make([], ["mystery"])?.columns).toEqual([
      { name: "mystery", originalDataType: "VARCHAR", castDataType: "VARCHAR" },
    ]);
  });

  it("builds no relation for a dataset with no CSV header", () => {
    expect(_make([_column("a", "Text")], undefined)).toBe(undefined);
  });
});

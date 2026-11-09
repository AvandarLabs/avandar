import { GHO_FACT_COLUMNS } from "@pipelines/gho/ghoFactColumns/ghoFactColumns";
import { makeGhoIndicatorRelation } from "@pipelines/gho/makeGhoIndicatorRelation/makeGhoIndicatorRelation";
import { describe, expect, it } from "vitest";
import type {
  GhoCrawlDrive,
  GhoIndicatorConnection,
  GhoIndicatorProbeRow,
} from "@pipelines/gho/gho.types";

const BASE_URL = "https://ghoapi.azureedge.net/api";
const CHECKED_AT = new Date("2026-11-09T06:00:00.000Z");

const DRIVE: GhoCrawlDrive = {
  baseUrl: BASE_URL,
  organizationLabels: { 1: "Organization", 2: "Collection" },
  indicatorSchemas: new Map(),
  checkedAt: CHECKED_AT,
};

const MAPPED_FIELDS = {
  organization1Name: "World Health Organization",
  organization2Name: "Global Health Observatory",
};

function _probeRow(
  overrides: Partial<GhoIndicatorProbeRow> = {},
): GhoIndicatorProbeRow {
  return {
    Date: "2024-01-05T10:00:00+01:00",
    SpatialDimType: "COUNTRY",
    Dim1Type: null,
    Dim2Type: null,
    Dim3Type: null,
    DataSourceDimType: null,
    ...overrides,
  };
}

function _connection(
  overrides: Partial<GhoIndicatorConnection> = {},
): GhoIndicatorConnection {
  return {
    kind: "indicator",
    code: "WHS3_62",
    name: "Measles - number of reported cases",
    sourceRecord: {
      IndicatorCode: "WHS3_62",
      IndicatorName: "Measles - number of reported cases",
      Language: "EN",
    },
    rowCount: 194,
    probeRows: [_probeRow()],
    hasFactSchema: true,
    ...overrides,
  };
}

function _make(overrides: Partial<GhoIndicatorConnection> = {}) {
  return makeGhoIndicatorRelation({
    drive: DRIVE,
    connection: _connection(overrides),
    mappedFields: MAPPED_FIELDS,
  });
}

describe("makeGhoIndicatorRelation", () => {
  it("lists the indicator by its code, name, and API URL, with its row count", () => {
    expect(_make()).toMatchObject({
      kind: "api_resource",
      externalDatasetId: "WHS3_62",
      apiResourceId: "WHS3_62",
      apiResourceFormat: "ODATA",
      sourceAssetType: "indicator",
      displayName: "Measles - number of reported cases",
      organization1Name: "World Health Organization",
      organization2Name: "Global Health Observatory",
      sourceUrl: `${BASE_URL}/WHS3_62`,
      metadata: { row_count: 194 },
    });
  });

  it("declares GHO's fact columns, verified at the run's check time", () => {
    const relation = _make();

    expect([relation.columns, relation.columnTypesVerifiedAt]).toEqual([
      GHO_FACT_COLUMNS,
      CHECKED_AT,
    ]);
  });

  it("probes freshness by the newest row's Date and the row count", () => {
    expect(_make().freshnessProbe).toEqual({
      url: `${BASE_URL}/WHS3_62?$orderby=Date%20desc&$top=1&$select=Date&$count=true`,
      token: {
        kind: "json-paths",
        paths: [["value", 0, "Date"], ["@odata.count"]],
      },
    });
  });

  it("dates the listing by its newest row's Date", () => {
    expect(
      _make({
        probeRows: [
          _probeRow({ Date: "2024-01-05T10:00:00+01:00" }),
          _probeRow({ Date: "2023-06-01T00:00:00Z" }),
        ],
      }).sourceUpdatedAt,
    ).toEqual(new Date("2024-01-05T09:00:00.000Z"));
  });

  it("leaves an indicator with no dated rows undated, so each run does not rewrite it", () => {
    expect(
      _make({ probeRows: [_probeRow({ Date: null })] }).sourceUpdatedAt,
    ).toBeUndefined();
    expect(
      _make({ rowCount: 0, probeRows: [] }).sourceUpdatedAt,
    ).toBeUndefined();
  });

  it("lists an indicator with no rows as not loadable, keeping its row count", () => {
    const relation = _make({ rowCount: 0, probeRows: [] });

    expect([relation.isWorkspaceLoadable, relation.metadata]).toEqual([
      false,
      { row_count: 0 },
    ]);
  });

  it("leaves an indicator with rows to the format's loadability", () => {
    expect(_make().isWorkspaceLoadable).toBeUndefined();
  });

  it("lists an indicator whose schema drifted as not loadable, with no columns", () => {
    const relation = _make({ hasFactSchema: false });

    expect([
      relation.isWorkspaceLoadable,
      relation.columns,
      relation.columnTypesVerifiedAt,
    ]).toEqual([false, [], undefined]);
  });

  it("tags an archived indicator", () => {
    expect(_make({ name: "Archived, see WHS3_63 instead" }).tags).toEqual([
      "Archived",
    ]);
  });

  it("does not tag a current indicator", () => {
    expect(_make().tags).toBeUndefined();
  });

  it("recommends a lookup for each dimension a code column holds, joined on its type and code", () => {
    const relation = _make({
      probeRows: [
        _probeRow({ SpatialDimType: "COUNTRY", Dim1Type: "SEX" }),
        _probeRow({ SpatialDimType: "REGION", Dim1Type: "SEX" }),
        _probeRow({
          SpatialDimType: "COUNTRY",
          DataSourceDimType: "DATASOURCE",
        }),
      ],
    });

    expect(relation.companions).toEqual([
      {
        kind: "lookup",
        externalDatasetId: "DIMENSION/COUNTRY",
        apiResourceId: "DIMENSION/COUNTRY/DimensionValues",
        joinOn: [
          { column: "SpatialDimType", companionColumn: "Dimension" },
          { column: "SpatialDim", companionColumn: "Code" },
        ],
      },
      {
        kind: "lookup",
        externalDatasetId: "DIMENSION/REGION",
        apiResourceId: "DIMENSION/REGION/DimensionValues",
        joinOn: [
          { column: "SpatialDimType", companionColumn: "Dimension" },
          { column: "SpatialDim", companionColumn: "Code" },
        ],
      },
      {
        kind: "lookup",
        externalDatasetId: "DIMENSION/SEX",
        apiResourceId: "DIMENSION/SEX/DimensionValues",
        joinOn: [
          { column: "Dim1Type", companionColumn: "Dimension" },
          { column: "Dim1", companionColumn: "Code" },
        ],
      },
      {
        kind: "lookup",
        externalDatasetId: "DIMENSION/DATASOURCE",
        apiResourceId: "DIMENSION/DATASOURCE/DimensionValues",
        joinOn: [
          { column: "DataSourceDimType", companionColumn: "Dimension" },
          { column: "DataSourceDim", companionColumn: "Code" },
        ],
      },
    ]);
  });

  it("orders one column's dimensions by code, so row order never changes them", () => {
    const companionIds = (rows: readonly GhoIndicatorProbeRow[]) => {
      return _make({ probeRows: rows }).companions?.map((companion) => {
        return companion.externalDatasetId;
      });
    };
    const country = _probeRow({ SpatialDimType: "COUNTRY" });
    const region = _probeRow({ SpatialDimType: "REGION" });

    expect(companionIds([region, country])).toEqual(
      companionIds([country, region]),
    );
  });

  it("recommends nothing for an indicator with no rows", () => {
    expect(_make({ rowCount: 0, probeRows: [] }).companions).toEqual([]);
  });
});

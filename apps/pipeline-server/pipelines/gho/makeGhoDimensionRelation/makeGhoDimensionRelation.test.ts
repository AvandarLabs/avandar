import { makeGhoDimensionRelation } from "@pipelines/gho/makeGhoDimensionRelation/makeGhoDimensionRelation";
import { describe, expect, it } from "vitest";
import type {
  GhoCrawlDrive,
  GhoDimensionConnection,
} from "@pipelines/gho/gho.types";

const BASE_URL = "https://ghoapi.azureedge.net/api";
const CHECKED_AT = new Date("2026-11-09T06:00:00.000Z");

const DRIVE: GhoCrawlDrive = {
  baseUrl: BASE_URL,
  organizationLabels: { 1: "Organization", 2: "Collection" },
  indicatorSchemas: new Map(),
  checkedAt: CHECKED_AT,
};

function _make(overrides: Partial<GhoDimensionConnection> = {}) {
  return makeGhoDimensionRelation({
    drive: DRIVE,
    connection: {
      kind: "dimension",
      code: "COUNTRY",
      title: "Country",
      sourceRecord: { Code: "COUNTRY", Title: "Country" },
      valueCount: 234,
      ...overrides,
    },
    mappedFields: { organization1Name: "World Health Organization" },
  });
}

describe("makeGhoDimensionRelation", () => {
  it("lists the dimension's value list by its DIMENSION path", () => {
    expect(_make()).toMatchObject({
      kind: "api_resource",
      externalDatasetId: "DIMENSION/COUNTRY",
      apiResourceId: "DIMENSION/COUNTRY/DimensionValues",
      apiResourceFormat: "ODATA",
      sourceAssetType: "dimension",
      displayName: "Country (GHO dimension values)",
      organization1Name: "World Health Organization",
      sourceUrl: `${BASE_URL}/DIMENSION/COUNTRY/DimensionValues`,
      metadata: { row_count: 234 },
    });
  });

  it("declares six text columns, verified at the run's check time", () => {
    const relation = _make();

    expect([
      relation.columns.map((column) => {
        return [column.name, column.castDataType];
      }),
      relation.columnTypesVerifiedAt,
    ]).toEqual([
      [
        ["Code", "VARCHAR"],
        ["Title", "VARCHAR"],
        ["Dimension", "VARCHAR"],
        ["ParentDimension", "VARCHAR"],
        ["ParentCode", "VARCHAR"],
        ["ParentTitle", "VARCHAR"],
      ],
      CHECKED_AT,
    ]);
  });

  it("probes freshness by hashing the whole value list", () => {
    expect(_make().freshnessProbe).toEqual({
      url: `${BASE_URL}/DIMENSION/COUNTRY/DimensionValues`,
      token: { kind: "body-sha256" },
    });
  });

  it("lists an empty dimension as not loadable", () => {
    expect(_make({ valueCount: 0 }).isWorkspaceLoadable).toBe(false);
  });

  it("leaves a dimension with values to the format's loadability", () => {
    expect(_make().isWorkspaceLoadable).toBeUndefined();
  });
});

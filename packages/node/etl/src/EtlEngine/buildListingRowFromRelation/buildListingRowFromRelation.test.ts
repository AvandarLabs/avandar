import { buildListingRowFromRelation } from "@etl/EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation";
import { LISTING_CONTRACT_COLUMNS } from "@etl/stores/listingContractColumns";
import { describe, expect, it } from "vitest";
import type {
  ApiResourceRelation,
  PipelineParquetRelation,
  Relation,
} from "@etl/EtlEngine/EtlEngine.types";

const SYNCED_AT = new Date("2026-10-20T12:00:00.000Z");
const DRIVE_KEY = "https://data.cityofnewyork.us";

const API_RELATION: ApiResourceRelation = {
  kind: "api_resource",
  externalDatasetId: "abcd-1234",
  apiResourceId: "abcd-1234",
  apiResourceFormat: "CSV",
  displayName: "Rodent Inspections",
  externalOrganizationName: "City of New York",
  sourceUpdatedAt: new Date("2026-10-19T08:30:00.000Z"),
  columns: [{ name: "a", originalDataType: "text", castDataType: "VARCHAR" }],
};

const PARQUET_RELATION: PipelineParquetRelation = {
  kind: "pipeline_parquet",
  externalDatasetId: "WDICSV",
  tableBaseName: "WDICSV",
  csvPath: "/tmp/WDICSV.csv",
  csvColumns: [],
  displayName: "World Development Indicators (WDI)",
  externalOrganizationName: "World Bank",
  sourceUpdatedAt: undefined,
};

function _build(
  relation: Relation,
  options: { service: string | undefined } = { service: "socrata" },
) {
  return buildListingRowFromRelation({
    relation,
    pipelineName: "socrata",
    pipelineRunId: "run-7",
    service: options.service,
    driveKey: DRIVE_KEY,
    syncedAt: SYNCED_AT,
    scopeKey: "format:csv",
  });
}

describe("buildListingRowFromRelation", () => {
  it("stamps the row with this run's pipeline, run id, and sync time", () => {
    const row = _build(API_RELATION);

    expect([
      row.pipeline_name,
      row.pipeline_run_id,
      row.date_of_last_sync,
    ]).toEqual(["socrata", "run-7", "2026-10-20T12:00:00.000Z"]);
  });

  it("writes the relation's source time to date_of_last_update", () => {
    expect(_build(API_RELATION).date_of_last_update).toBe(
      "2026-10-19T08:30:00.000Z",
    );
  });

  it("leaves an API relation's column types unverified when it read none", () => {
    expect(_build(API_RELATION).date_column_type_last_verified).toBe(null);
  });

  it("writes when an API relation's column types were verified", () => {
    expect(
      _build({
        ...API_RELATION,
        columnTypesVerifiedAt: new Date("2026-10-20T11:00:00.000Z"),
      }).date_column_type_last_verified,
    ).toBe("2026-10-20T11:00:00.000Z");
  });

  it("marks a Parquet relation's column types verified at sync time", () => {
    expect(
      _build(PARQUET_RELATION, { service: undefined })
        .date_column_type_last_verified,
    ).toBe("2026-10-20T12:00:00.000Z");
  });

  it("records the scope that produced the row", () => {
    expect(_build(API_RELATION).pipeline_scope_keys).toEqual(["format:csv"]);
  });

  it("writes an API relation's service, drive, and resource, and no Parquet column", () => {
    const row = _build(API_RELATION);

    expect([
      row.access_kind,
      row.api_service,
      row.api_base_url,
      row.api_resource_id,
      row.api_resource_format,
      row.parquet_file_name,
    ]).toEqual([
      "api_resource",
      "socrata",
      DRIVE_KEY,
      "abcd-1234",
      "CSV",
      null,
    ]);
  });

  it("writes a Parquet relation's file name and no API column", () => {
    const row = _build(PARQUET_RELATION, { service: undefined });

    expect([
      row.access_kind,
      row.parquet_file_name,
      row.api_service,
      row.api_base_url,
      row.api_resource_id,
      row.api_resource_format,
    ]).toEqual(["pipeline_parquet", "WDICSV.parquet", null, null, null, null]);
  });

  it("writes exactly the contract's columns and never a cache column", () => {
    const columns = Object.keys(_build(API_RELATION)).sort();

    expect(columns).toEqual([...LISTING_CONTRACT_COLUMNS].sort());
    expect(columns).not.toContain("cached_object_path");
  });

  it("refuses an API relation when the engine has no service", () => {
    expect(() => {
      return _build(API_RELATION, { service: undefined });
    }).toThrow("service");
  });

  it("names the relation when its source time is not a valid date", () => {
    expect(() => {
      return _build({ ...API_RELATION, sourceUpdatedAt: new Date("nope") });
    }).toThrow(/Rodent Inspections.*abcd-1234/);
  });

  it("names the relation when a coverage date is not a valid date", () => {
    expect(() => {
      return _build({ ...API_RELATION, coverageEndDate: new Date("nope") });
    }).toThrow(/Rodent Inspections.*abcd-1234/);
  });
});

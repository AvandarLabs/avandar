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
  organization1Name: "City of New York",
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
  organization1Name: "World Bank",
  sourceUpdatedAt: undefined,
};

function _build(
  relation: Relation,
  options: {
    service?: string | undefined;
    unloadableFormats?: readonly string[];
    driveId?: string;
  } = {},
) {
  return buildListingRowFromRelation({
    relation,
    pipelineName: "socrata",
    pipelineRunId: "run-7",
    service: "service" in options ? options.service : "socrata",
    driveKey: DRIVE_KEY,
    driveId: options.driveId,
    syncedAt: SYNCED_AT,
    scopeKey: "format:csv",
    workspaceLoadability: {
      unloadableFormats: options.unloadableFormats ?? [],
    },
  });
}

describe("buildListingRowFromRelation", () => {
  it("writes the organization levels, domains, tags, source record, and drive", () => {
    const row = _build(
      {
        ...API_RELATION,
        organization2Name: "Taxi and Limousine Commission",
        organization3Name: "Licensing",
        domains: ["Transportation"],
        tags: ["taxi", "fhv"],
        additionalSourceMetadata: { resource: { id: "8wbx-tsch" } },
      },
      { driveId: "6f7e2c1a-0000-4000-8000-000000000001" },
    );

    expect(row).toMatchObject({
      organization2_name: "Taxi and Limousine Commission",
      organization3_name: "Licensing",
      organization4_name: null,
      domains: ["Transportation"],
      tags: ["taxi", "fhv"],
      additional_source_metadata: { resource: { id: "8wbx-tsch" } },
      drive_id: "6f7e2c1a-0000-4000-8000-000000000001",
    });
  });

  it("writes null for every new column a relation leaves unset", () => {
    const row = _build(API_RELATION);

    expect(row).toMatchObject({
      organization2_name: null,
      organization3_name: null,
      organization4_name: null,
      domains: null,
      tags: null,
      additional_source_metadata: null,
      drive_id: null,
    });
  });

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

  it("writes exactly the contract's columns and never a Parquet copy column", () => {
    const columns = Object.keys(_build(API_RELATION)).sort();

    expect(columns).toEqual([...LISTING_CONTRACT_COLUMNS].sort());
    expect(
      columns.filter((column) => {
        return column.startsWith("parquet_cache_");
      }),
    ).toEqual([]);
  });

  it("writes an API relation's companions and freshness probe", () => {
    const companions = [
      {
        kind: "lookup",
        externalDatasetId: "DIMENSION/COUNTRY",
        apiResourceId: "DIMENSION/COUNTRY/DimensionValues",
        joinOn: [
          { column: "SpatialDimType", companionColumn: "Dimension" },
          { column: "SpatialDim", companionColumn: "Code" },
        ],
      },
    ] as const;
    const freshnessProbe = {
      url: `${DRIVE_KEY}/abcd-1234`,
      token: { kind: "body-sha256" },
    } as const;

    const row = _build({ ...API_RELATION, companions, freshnessProbe });

    expect([row.companion_listings, row.api_freshness_probe]).toEqual([
      companions,
      freshnessProbe,
    ]);
  });

  it("writes no companions and no freshness probe when an API relation has none", () => {
    const row = _build(API_RELATION);

    expect([row.companion_listings, row.api_freshness_probe]).toEqual([
      [],
      null,
    ]);
  });

  it("writes no companions and no freshness probe for a Parquet relation", () => {
    const row = _build(PARQUET_RELATION, { service: undefined });

    expect([row.companion_listings, row.api_freshness_probe]).toEqual([
      [],
      null,
    ]);
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
  describe("workspace loadability", () => {
    it("marks an API relation loadable when nothing rules it out", () => {
      expect(_build(API_RELATION).is_workspace_loadable).toBe(true);
    });

    it("marks an API relation unloadable when the pipeline says so", () => {
      const row = _build({ ...API_RELATION, isWorkspaceLoadable: false });

      expect(row.is_workspace_loadable).toBe(false);
    });

    it("marks an API relation unloadable when its format is unloadable", () => {
      const row = _build(
        { ...API_RELATION, apiResourceFormat: "PDF" },
        { unloadableFormats: ["pdf"] },
      );

      expect(row.is_workspace_loadable).toBe(false);
    });

    it("lets the format rule win over a pipeline that calls it loadable", () => {
      const row = _build(
        {
          ...API_RELATION,
          apiResourceFormat: "XLSX",
          isWorkspaceLoadable: true,
        },
        { unloadableFormats: ["xlsx"] },
      );

      expect(row.is_workspace_loadable).toBe(false);
    });

    it("marks an API relation with no format unloadable", () => {
      const row = _build({ ...API_RELATION, apiResourceFormat: undefined });

      expect([row.is_workspace_loadable, row.api_resource_format]).toEqual([
        false,
        null,
      ]);
    });

    it("always marks a Parquet relation loadable", () => {
      const row = _build(PARQUET_RELATION, { unloadableFormats: ["parquet"] });

      expect(row.is_workspace_loadable).toBe(true);
    });

    it("writes the source's asset type and download URL", () => {
      const row = _build({
        ...API_RELATION,
        sourceAssetType: "file",
        sourceDownloadUrl: "https://example.invalid/download/abcd-1234",
      });

      expect([row.source_asset_type, row.source_download_url]).toEqual([
        "file",
        "https://example.invalid/download/abcd-1234",
      ]);
    });

    it("writes null asset type and download URL when unset", () => {
      const row = _build(API_RELATION);

      expect([row.source_asset_type, row.source_download_url]).toEqual([
        null,
        null,
      ]);
    });
  });
});

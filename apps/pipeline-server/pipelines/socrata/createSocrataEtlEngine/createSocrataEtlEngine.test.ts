import {
  createInMemoryCheckpointStore,
  createInMemoryDrivesStore,
  createInMemoryListingsStore,
  loadCatalogFieldMapper,
} from "@avandar/etl";
import { createSocrataEtlEngine } from "@pipelines/socrata/createSocrataEtlEngine/createSocrataEtlEngine";
import { describe, expect, it, vi } from "vitest";
import type {
  SocrataDiscoveryClient,
  SocrataDiscoveryResult,
} from "$/connectors/open-data/SocrataDiscoveryClient/SocrataDiscoveryClient.types";
import type {
  CatalogFieldMapper,
  EtlStores,
  PipelineConfig,
} from "@avandar/etl";

const DRIVE = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationLabels: { 1: "City" },
};
const OUTPUT = {
  listingsTable: "data_catalog_listings",
  upsertListingsFunction:
    "rpc_data_catalog_listings__upsert_with_relation_columns",
};

function _catalog(size: number): SocrataDiscoveryResult[] {
  return Array.from({ length: size }, (_, index) => {
    return {
      sourceRecord: {},
      datasetId: `ds-${index}`,
      name: `Dataset ${index}`,
      domain: "data.cityofnewyork.us",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: new Date(Date.UTC(2026, 9, 1, 0, index)).toISOString(),
      assetType: "dataset",
      blobMimeType: undefined,
      columns: [{ fieldName: "a", name: "A", dataType: "Text" }],
    };
  });
}

function _discoveryOver(
  catalog: readonly SocrataDiscoveryResult[],
): SocrataDiscoveryClient {
  return {
    search: vi.fn(async ({ limit = 100, offset = 0 }) => {
      return {
        results: catalog.slice(offset, offset + limit),
        skippedResults: [],
        resultSetSize: catalog.length,
      };
    }),
  };
}

async function _mapper(
  fields: PipelineConfig["fields"] = {},
): Promise<CatalogFieldMapper> {
  return await loadCatalogFieldMapper({
    config: {
      fields: { organization1_name: { value: "City of New York" }, ...fields },
      drives: [{ baseUrl: DRIVE.baseUrl }],
    },
    configDir: "/",
  });
}

async function _engine(
  stores: EtlStores,
  catalog: readonly SocrataDiscoveryResult[],
  unloadableFormats: readonly string[] = [],
) {
  return createSocrataEtlEngine({
    output: OUTPUT,
    discovery: _discoveryOver(catalog),
    drives: [DRIVE],
    mapper: await _mapper(),
    stores,
    workspaceLoadability: { unloadableFormats },
  });
}

describe("createSocrataEtlEngine", () => {
  it("writes one listing per dataset, dated by its updatedAt", async () => {
    const listings = createInMemoryListingsStore();
    const stores = {
      listings,
      objects: undefined,
      checkpoints: createInMemoryCheckpointStore(),
    };

    await (await _engine(stores, _catalog(3))).run({ mode: "full" });

    expect(
      listings.getRows().map((row) => {
        return [row.pipeline_name, row.api_base_url, row.date_of_last_update];
      }),
    ).toEqual([
      ["socrata", DRIVE.baseUrl, "2026-10-01T00:00:00.000Z"],
      ["socrata", DRIVE.baseUrl, "2026-10-01T00:01:00.000Z"],
      ["socrata", DRIVE.baseUrl, "2026-10-01T00:02:00.000Z"],
    ]);
  });

  it("writes each listing's columns with it, and lists a dataset with none the export has as unloadable", async () => {
    const listings = createInMemoryListingsStore();
    const catalog = _catalog(2).map((result, index) => {
      return index === 0
        ? result
        : {
            ...result,
            columns: [
              {
                fieldName: ":@computed_region_92fq_4b7q",
                name: "Region",
                dataType: "Number",
              },
            ],
          };
    });

    const report = await (
      await _engine(
        {
          listings,
          objects: undefined,
          checkpoints: createInMemoryCheckpointStore(),
        },
        catalog,
      )
    ).run({ mode: "full" });

    const [row, columnlessRow] = listings.getRows();
    expect([
      report.crawls[0]?.relationsWritten,
      listings.getRelationColumns(row?.id ?? "")?.map((column) => {
        return [column.column_name, column.cast_data_type];
      }),
      row?.is_workspace_loadable,
      columnlessRow?.is_workspace_loadable,
      listings.getRelationColumns(columnlessRow?.id ?? ""),
    ]).toEqual([2, [["a", "VARCHAR"]], true, false, []]);
  });

  it("lists every asset type, and marks only datasets loadable", async () => {
    const listings = createInMemoryListingsStore();
    const catalog = _catalog(3).map((result, index) => {
      if (index === 1) {
        return { ...result, assetType: "map", columns: [] };
      }
      if (index === 2) {
        return {
          ...result,
          assetType: "file",
          blobMimeType: "application/pdf",
          columns: [],
        };
      }
      return result;
    });

    await (
      await _engine(
        {
          listings,
          objects: undefined,
          checkpoints: createInMemoryCheckpointStore(),
        },
        catalog,
      )
    ).run({ mode: "full" });

    expect(
      listings.getRows().map((row) => {
        return [
          row.source_asset_type,
          row.api_resource_format,
          row.is_workspace_loadable,
          row.source_url,
        ];
      }),
    ).toEqual([
      ["dataset", "CSV", true, `${DRIVE.baseUrl}/d/ds-0`],
      ["map", null, false, `${DRIVE.baseUrl}/d/ds-1`],
      ["file", "PDF", false, `${DRIVE.baseUrl}/d/ds-2`],
    ]);
  });

  it("applies the workspace loadability rules it is given", async () => {
    const listings = createInMemoryListingsStore();

    await (
      await _engine(
        {
          listings,
          objects: undefined,
          checkpoints: createInMemoryCheckpointStore(),
        },
        _catalog(1),
        ["csv"],
      )
    ).run({ mode: "full" });

    expect(listings.getRows()[0]?.is_workspace_loadable).toBe(false);
  });

  it("writes each dataset once across overlapping pages", async () => {
    const listings = createInMemoryListingsStore();
    const stores = {
      listings,
      objects: undefined,
      checkpoints: createInMemoryCheckpointStore(),
    };

    await (await _engine(stores, _catalog(1500))).run({ mode: "full" });

    const upserted = listings.getUpsertBatches().reduce((sum, batch) => {
      return sum + batch.length;
    }, 0);
    expect([listings.getRows().length, upserted]).toEqual([1500, 1500]);
  });

  it("continues an incremental run from its checkpoint", async () => {
    const listings = createInMemoryListingsStore();
    const stores = {
      listings,
      objects: undefined,
      checkpoints: createInMemoryCheckpointStore(),
    };
    await (await _engine(stores, _catalog(5))).run({ mode: "full", limit: 2 });

    const report = await (
      await _engine(stores, _catalog(5))
    ).run({
      mode: "incremental",
    });

    expect([
      report.crawls[0]?.relationsWritten,
      listings.getRows().length,
    ]).toEqual([3, 5]);
  });

  it("crawls each of a drive's scopes and records them on its rows", async () => {
    const listings = createInMemoryListingsStore();
    const discovery = _discoveryOver(_catalog(1));

    await createSocrataEtlEngine({
      output: OUTPUT,
      discovery,
      drives: [
        {
          ...DRIVE,
          scopes: [
            { key: "category:education", categories: ["Education"] },
            { key: "tag:doe", tags: ["doe"] },
          ],
        },
      ],
      mapper: await _mapper(),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
    }).run({ mode: "full" });

    expect([
      vi.mocked(discovery.search).mock.calls.map(([params]) => {
        return [params.categories, params.tags];
      }),
      listings.getRows().map((row) => {
        return row.pipeline_scope_keys;
      }),
    ]).toEqual([
      [
        [["Education"], undefined],
        [undefined, ["doe"]],
      ],
      [["category:education", "tag:doe"]],
    ]);
  });

  it("lists all as the scope of a drive without scopes", async () => {
    const scopes = await createSocrataEtlEngine({
      output: OUTPUT,
      discovery: _discoveryOver([]),
      drives: [DRIVE],
      mapper: await _mapper(),
    }).listScopes();

    expect(scopes).toEqual([{ driveKey: DRIVE.baseUrl, scopeKeys: ["all"] }]);
  });

  it("maps each result's metadata and records the drive's labels", async () => {
    const listings = createInMemoryListingsStore();
    const drives = createInMemoryDrivesStore();
    const catalog = _catalog(1).map((result) => {
      return {
        ...result,
        sourceRecord: {
          resource: { attribution: "TLC", provenance: "official" },
        },
      };
    });
    const engine = createSocrataEtlEngine({
      output: OUTPUT,
      discovery: _discoveryOver(catalog),
      drives: [DRIVE],
      mapper: await _mapper({
        organization2_name: { from: "resource.attribution" },
      }),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
        drives,
      },
      workspaceLoadability: { unloadableFormats: [] },
    });

    await engine.run({ mode: "full" });

    expect(listings.getRows()[0]).toMatchObject({
      organization1_name: "City of New York",
      organization2_name: "TLC",
      additional_source_metadata: { resource: { provenance: "official" } },
      drive_id: drives.getDrives()[0]?.id,
    });
    expect(drives.getDrives()[0]?.organizationLabels).toEqual({ 1: "City" });
  });

  it("skips a result whose organization1_name maps to nothing, with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const listings = createInMemoryListingsStore();
      const engine = createSocrataEtlEngine({
        output: OUTPUT,
        discovery: _discoveryOver(_catalog(1)),
        drives: [DRIVE],
        mapper: await loadCatalogFieldMapper({
          config: {
            fields: { organization1_name: { from: "missing.path" } },
            drives: [{ baseUrl: DRIVE.baseUrl }],
          },
          configDir: "/",
        }),
        stores: {
          listings,
          objects: undefined,
          checkpoints: createInMemoryCheckpointStore(),
        },
      });

      await engine.run({ mode: "full" });

      expect(listings.getRows()).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "skipped ds-0: organization1_name mapped to nothing",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });
});

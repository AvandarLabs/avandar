import {
  createInMemoryCheckpointStore,
  createInMemoryDrivesStore,
  createInMemoryListingsStore,
  loadCatalogFieldMapper,
} from "@avandar/etl";
import { createHdxEtlEngine } from "@pipelines/hdx/createHdxEtlEngine/createHdxEtlEngine";
import { describe, expect, it, vi } from "vitest";
import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp";
import type { CkanPackage } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type { CkanDiscoveryClient } from "$/connectors/open-data/CkanDiscoveryClient/CkanDiscoveryClient.types";
import type { CatalogFieldMapper, PipelineConfig } from "@avandar/etl";

const DRIVE = {
  baseUrl: "https://data.humdata.org",
  organizationLabels: { 1: "Organization" },
};
const OUTPUT = {
  listingsTable: "data_catalog_listings",
  upsertListingsFunction:
    "rpc_data_catalog_listings__upsert_with_relation_columns",
};

async function _mapper(
  fields: PipelineConfig["fields"] = {},
): Promise<CatalogFieldMapper> {
  return await loadCatalogFieldMapper({
    config: {
      fields: { organization1_name: { value: "Test Org" }, ...fields },
      drives: [{ baseUrl: DRIVE.baseUrl }],
    },
    configDir: "/",
  });
}

function _package(name: string, day: number): CkanPackage {
  return {
    sourceRecord: {},
    id: name,
    name,
    metadata_modified: `2026-10-${String(day).padStart(2, "0")}T00:00:00.000`,
    resources: [
      {
        id: `${name}-csv`,
        name: `${name}.csv`,
        format: "CSV",
        url: `https://data.humdata.org/dataset/${name}/resource/${name}-csv/download/${name}.csv`,
        url_type: "upload",
        size: 100,
        hash: "",
        last_modified: undefined,
        mimetype: undefined,
        datastore_active: false,
        fileHeaders: ["value"],
      },
    ],
  };
}

/** A dataset with one CSV and one Parquet resource. */
function _packageWithParquet(name: string, day: number): CkanPackage {
  const ckanPackage = _package(name, day);
  const [csvResource] = ckanPackage.resources;
  return {
    ...ckanPackage,
    resources: [
      ...ckanPackage.resources,
      {
        ...csvResource!,
        id: `${name}-parquet`,
        name: `${name}.parquet`,
        format: "Parquet",
        url: `https://data.humdata.org/dataset/${name}/resource/${name}-parquet/download/${name}.parquet`,
      },
    ],
  };
}

/**
 * A one-page fake `package_search` that applies `modifiedSince` and
 * `resourceFormats` the way CKAN does.
 */
function _discovery(catalog: readonly CkanPackage[]): CkanDiscoveryClient {
  return {
    searchDatasets: vi.fn(async ({ modifiedSince, resourceFormats }) => {
      const datasets = catalog.filter((dataset) => {
        const isInWindow =
          modifiedSince === undefined ||
          parseCkanTimestamp(dataset.metadata_modified ?? "").getTime() >=
            modifiedSince.getTime();
        const hasFormat =
          resourceFormats === undefined ||
          dataset.resources.some((resource) => {
            return resourceFormats.includes(resource.format);
          });
        return isInWindow && hasFormat;
      });
      const lastDataset = datasets.at(-1);
      return {
        datasets,
        skippedDatasets: [],
        nextCursor:
          lastDataset === undefined
            ? undefined
            : {
                modifiedAt: parseCkanTimestamp(
                  lastDataset.metadata_modified ?? "",
                ),
                name: lastDataset.name,
              },
        resultCount: datasets.length,
      };
    }),
  };
}

describe("createHdxEtlEngine", () => {
  it("writes one listing per readable resource, dated by metadata_modified", async () => {
    const listings = createInMemoryListingsStore();

    await createHdxEtlEngine({
      output: OUTPUT,
      discovery: _discovery([_package("a", 1), _package("b", 2)]),
      drives: [DRIVE],
      mapper: await _mapper(),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
    }).run({ mode: "full" });

    expect(
      listings.getRows().map((row) => {
        return [
          row.pipeline_name,
          row.api_service,
          row.api_resource_id,
          row.date_of_last_update,
        ];
      }),
    ).toEqual([
      ["hdx", "ckan", "a-csv", "2026-10-01T00:00:00.000Z"],
      ["hdx", "ckan", "b-csv", "2026-10-02T00:00:00.000Z"],
    ]);
  });

  it("asks an incremental run for datasets modified since its checkpoint", async () => {
    const listings = createInMemoryListingsStore();
    const engineArgs = {
      output: OUTPUT,
      drives: [DRIVE],
      mapper: await _mapper(),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
    };
    await createHdxEtlEngine({
      ...engineArgs,
      discovery: _discovery([_package("a", 1), _package("b", 2)]),
    }).run({ mode: "full" });
    const discovery = _discovery([
      _package("a", 1),
      _package("b", 2),
      _package("c", 3),
    ]);

    const report = await createHdxEtlEngine({ ...engineArgs, discovery }).run({
      mode: "incremental",
    });

    expect([
      vi.mocked(discovery.searchDatasets).mock.calls[0]?.[0].modifiedSince,
      report.crawls[0]?.relationsWritten,
    ]).toEqual([new Date("2026-10-02T00:00:00.000Z"), 1]);
  });

  it("crawls nothing when the config lists no HDX drive", async () => {
    const discovery = _discovery([_package("a", 1)]);

    const report = await createHdxEtlEngine({
      output: OUTPUT,
      discovery,
      drives: [],
      mapper: await _mapper(),
      stores: {
        listings: createInMemoryListingsStore(),
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
    }).run({ mode: "full" });

    expect([
      report.crawls,
      vi.mocked(discovery.searchDatasets).mock.calls.length,
    ]).toEqual([[], 0]);
  });

  it("crawls the CSV scope, the Parquet scope, then every other format, each writing only its own", async () => {
    const listings = createInMemoryListingsStore();
    const discovery = _discovery([_packageWithParquet("a", 1)]);

    await createHdxEtlEngine({
      output: OUTPUT,
      discovery,
      drives: [DRIVE],
      mapper: await _mapper(),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
    }).run({ mode: "full" });

    expect([
      vi.mocked(discovery.searchDatasets).mock.calls.map(([params]) => {
        return params.resourceFormats;
      }),
      listings.getRows().map((row) => {
        return [row.api_resource_id, row.pipeline_scope_keys];
      }),
    ]).toEqual([
      [["CSV"], ["Parquet"], undefined],
      [
        ["a-csv", ["format:csv"]],
        ["a-parquet", ["format:parquet"]],
      ],
    ]);
  });

  it("writes header columns unverified, a CSV without headers with no columns, and a Parquet file's verified columns", async () => {
    const listings = createInMemoryListingsStore();
    const [resource] = _package("a", 1).resources;
    const readFileColumns = vi.fn(async () => {
      return [
        { name: "year", originalDataType: "BIGINT", castDataType: "BIGINT" },
      ] as const;
    });

    await createHdxEtlEngine({
      output: OUTPUT,
      discovery: _discovery([
        _package("with-headers", 1),
        {
          ..._package("without-headers", 2),
          resources: [
            {
              ...resource!,
              id: "without-headers-csv",
              fileHeaders: undefined,
            },
            {
              ...resource!,
              id: "without-headers-parquet",
              format: "Parquet",
              fileHeaders: undefined,
            },
          ],
        },
      ]),
      drives: [DRIVE],
      mapper: await _mapper(),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
      },
      readFileColumns,
    }).run({ mode: "full" });

    expect(
      listings.getRows().map((row) => {
        return [
          row.api_resource_id,
          row.date_column_type_last_verified === null,
          listings.getRelationColumns(row.id)?.map((column) => {
            return [column.column_name, column.cast_data_type];
          }),
        ];
      }),
    ).toEqual([
      ["with-headers-csv", true, [["value", "VARCHAR"]]],
      ["without-headers-csv", true, []],
      ["without-headers-parquet", false, [["year", "BIGINT"]]],
    ]);
    expect(readFileColumns).toHaveBeenCalledTimes(1);
  });

  it("lists one scope per format for its drive", async () => {
    const scopes = await createHdxEtlEngine({
      output: OUTPUT,
      discovery: _discovery([]),
      drives: [DRIVE],
      mapper: await _mapper(),
    }).listScopes();

    expect(scopes).toEqual([
      {
        driveKey: DRIVE.baseUrl,
        scopeKeys: ["format:csv", "format:parquet", "format:other"],
      },
    ]);
  });

  it("maps each package's metadata and records the drive's labels", async () => {
    const listings = createInMemoryListingsStore();
    const drives = createInMemoryDrivesStore();
    const sourceRecord = {
      organization: { title: "World Health Organization" },
      notes: "Measles cases by week.",
    };

    await createHdxEtlEngine({
      output: OUTPUT,
      discovery: _discovery([{ ..._package("a", 1), sourceRecord }]),
      drives: [DRIVE],
      mapper: await _mapper({
        organization1_name: { from: "organization.title" },
        description: { from: "notes" },
      }),
      stores: {
        listings,
        objects: undefined,
        checkpoints: createInMemoryCheckpointStore(),
        drives,
      },
    }).run({ mode: "full" });

    expect(listings.getRows()[0]).toMatchObject({
      organization1_name: "World Health Organization",
      description: "Measles cases by week.",
      source_metadata: sourceRecord,
      drive_id: drives.getDrives()[0]?.id,
    });
    expect(drives.getDrives()[0]?.organizationLabels).toEqual({
      1: "Organization",
    });
  });

  it("skips a package whose organization1_name maps to nothing, with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const listings = createInMemoryListingsStore();

      await createHdxEtlEngine({
        output: OUTPUT,
        discovery: _discovery([_package("a", 1)]),
        drives: [DRIVE],
        mapper: await _mapper({
          organization1_name: { from: "organization.title" },
        }),
        stores: {
          listings,
          objects: undefined,
          checkpoints: createInMemoryCheckpointStore(),
        },
      }).run({ mode: "full" });

      expect(listings.getRows()).toEqual([]);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "[hdx] skipped a: organization1_name mapped to nothing",
        ),
      );
    } finally {
      warn.mockRestore();
    }
  });
});

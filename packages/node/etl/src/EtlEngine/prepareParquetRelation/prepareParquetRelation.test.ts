import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildListingRowFromRelation } from "@etl/EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation";
import {
  resetEtlPathsRootForTesting,
  setEtlPathsRootForTesting,
} from "@etl/EtlEngine/etlPaths";
import { prepareParquetRelation } from "@etl/EtlEngine/prepareParquetRelation/prepareParquetRelation";
import { createInMemoryObjectStore } from "@etl/stores/InMemoryObjectStore/createInMemoryObjectStore";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  EtlPipelineRunId,
  PipelineParquetRelation,
} from "@etl/EtlEngine/EtlEngine.types";
import type { StoredListingRow } from "@etl/stores/EtlStores.types";
import type { InMemoryObjectStore } from "@etl/stores/InMemoryObjectStore/createInMemoryObjectStore";

const PIPELINE_NAME = "world-bank__wdi";
const RUN_ID = "00000000-0000-4000-8000-000000000001" as EtlPipelineRunId;
const OBJECT_PATH = "world-bank__wdi/datasets/WDICSV.parquet";

let testRoot: string;
let csvPath: string;

beforeEach(async () => {
  testRoot = await mkdtemp(join(tmpdir(), "etl-prepare-"));
  setEtlPathsRootForTesting(testRoot);
  csvPath = join(testRoot, "WDICSV.csv");
  await writeFile(
    csvPath,
    "Country,Year,Value\nAruba,YR1960,1.5\nAruba,YR1961,2.5\n",
  );
});

afterEach(async () => {
  resetEtlPathsRootForTesting();
  await rm(testRoot, { force: true, recursive: true });
});

function _relation(
  overrides: Partial<PipelineParquetRelation> = {},
): PipelineParquetRelation {
  return {
    kind: "pipeline_parquet",
    externalDatasetId: "WDICSV",
    tableBaseName: "WDICSV",
    csvPath,
    csvColumns: [],
    displayName: "World Development Indicators (WDI)",
    externalOrganizationName: "World Bank",
    sourceUpdatedAt: undefined,
    ...overrides,
  };
}

function _prepare(args: {
  relation?: PipelineParquetRelation;
  stored?: StoredListingRow;
  objects?: InMemoryObjectStore;
  bucket?: string | undefined;
}) {
  const relation = args.relation ?? _relation();
  return prepareParquetRelation({
    relation,
    row: buildListingRowFromRelation({
      relation,
      pipelineName: PIPELINE_NAME,
      pipelineRunId: RUN_ID,
      service: undefined,
      driveKey: PIPELINE_NAME,
      syncedAt: new Date("2026-10-20T12:00:00.000Z"),
    }),
    stored: args.stored,
    pipelineName: PIPELINE_NAME,
    pipelineRunId: RUN_ID,
    objects: args.objects ?? createInMemoryObjectStore(),
    bucket: "bucket" in args ? args.bucket : "opendata",
  });
}

describe("prepareParquetRelation", () => {
  it("uploads the Parquet object to <pipeline>/datasets/<table>.parquet", async () => {
    const objects = createInMemoryObjectStore();

    await _prepare({ objects });

    expect(objects.getUploadedPaths()).toEqual([OBJECT_PATH]);
  });

  it("skips the upload when the stored hash matches", async () => {
    const first = await _prepare({});
    const objects = createInMemoryObjectStore();

    await _prepare({ objects, stored: { ...first.row, id: "listing-1" } });

    expect(objects.getUploadedPaths()).toEqual([]);
  });

  it("uploads and records the new hash when the stored hash differs", async () => {
    const first = await _prepare({});
    const objects = createInMemoryObjectStore();

    const second = await _prepare({
      objects,
      stored: {
        ...first.row,
        id: "listing-1",
        metadata: { parquet_sha256: "stale" },
      },
    });

    expect([
      objects.getUploadedPaths(),
      second.row.metadata?.parquet_sha256,
    ]).toEqual([[OBJECT_PATH], first.row.metadata?.parquet_sha256]);
  });

  it("adds the table summary and object path over the relation's own metadata", async () => {
    const { row } = await _prepare({
      relation: _relation({ metadata: { year_coverage: { min_year: 1960 } } }),
    });

    expect(row.metadata).toEqual({
      year_coverage: { min_year: 1960 },
      open_data_bucket: "opendata",
      storage_object_path: OBJECT_PATH,
      table: {
        name: "WDICSV",
        row_count: 2,
        column_names: ["Country", "Year", "Value"],
      },
      parquet_sha256: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("appends the object's public URL to canonical_urls", async () => {
    const { row } = await _prepare({
      relation: _relation({ canonicalUrls: ["https://source.invalid"] }),
    });

    expect(row.canonical_urls).toEqual([
      "https://source.invalid",
      `https://objects.invalid/${OBJECT_PATH}`,
    ]);
  });

  it("derives the relation columns from the Parquet file", async () => {
    const { columns } = await _prepare({});

    expect(
      columns.map((column) => {
        return [
          column.column_name,
          column.display_order,
          column.cast_data_type,
        ];
      }),
    ).toEqual([
      ["Country", 0, "VARCHAR"],
      ["Year", 1, "VARCHAR"],
      ["Value", 2, "DOUBLE"],
    ]);
  });

  it("rejects when no bucket is configured", async () => {
    await expect(_prepare({ bucket: undefined })).rejects.toThrow(
      "output.bucket",
    );
  });
});

import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";
import { NodeDuckDb } from "@avandar/etl";
import { buildOpenDataParquetCache } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenDataHttp } from "$/connectors/open-data/CkanClient/CkanClient.types";
import type {
  FreshnessProbe,
  ListingDownload,
  PipelineDownloadConfig,
} from "@avandar/etl";
import type { OpenDataParquetCacheDependencies } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";

const LISTING = {
  id: "5b89fc55-586d-485f-8526-3c7a9a1b0d90",
  pipelineName: "example",
  apiBaseUrl: "https://data.example.gov",
  apiResourceId: "abcd-1234",
  externalDatasetId: "abcd-1234",
  apiResourceFormat: "CSV",
};
const BUILD_ID = "9f1d2c3b-0000-4000-8000-000000000002";
const FOLDER = `catalog-cache/${LISTING.id}/${BUILD_ID}`;

/** Three pages of two rows, then an empty one: page URLs carry the cursor. */
const PAGES: Readonly<Record<string, string>> = {
  "page:start":
    '":id","county","cases"\n"r-9","Kings","3"\n"r-2","Queens","4"\n',
  "page:r-2":
    '":id","county","cases"\n"r-7","Bronx","5"\n"r-1","Richmond","6"\n',
  "page:r-1": '":id","county","cases"\n"r-4","Erie","7"\n',
};

function _createPagedDownload(
  overrides: Partial<Extract<ListingDownload, { paging: true }>> = {},
): ListingDownload {
  return {
    paging: true,
    sourceVersion: "v1",
    columns: [
      { name: "county", dataType: "VARCHAR" },
      { name: "cases", dataType: "DOUBLE" },
    ],
    cursorColumn: ":id",
    buildPageUrl: (afterCursor) => {
      return `page:${afterCursor ?? "start"}`;
    },
    readSourceVersion: vi.fn().mockResolvedValue("v1"),
    ...overrides,
  };
}

const PROBE: FreshnessProbe = {
  url: `${LISTING.apiBaseUrl}/abcd-1234?$top=1`,
  token: { kind: "json-paths", paths: [["count"]] },
};

/** A probe client whose answers count up through `counts`, one per read. */
function _createProbeHttp(counts: readonly number[]): OpenDataHttp {
  let readIndex = 0;
  return {
    get: vi.fn(),
    getBytes: vi.fn(async () => {
      const count = counts[Math.min(readIndex, counts.length - 1)];
      readIndex += 1;
      return new TextEncoder().encode(
        JSON.stringify({ count }),
      ) as Uint8Array<ArrayBuffer>;
    }),
  };
}

/** Uploads land in a local folder, so a test reads what was uploaded. */
function _createDependencies(args: {
  config: PipelineDownloadConfig;
  download: ListingDownload;
  bucketDir: string;
  files?: Readonly<Record<string, string>>;
  probeCounts?: readonly number[];
}): OpenDataParquetCacheDependencies & {
  uploadedPaths: string[];
  script: ReturnType<typeof vi.fn>;
} {
  const uploadedPaths: string[] = [];
  const script = vi.fn().mockResolvedValue(args.download);
  return {
    uploadedPaths,
    script,
    probeHttp: _createProbeHttp(args.probeCounts ?? [1]),
    loadPipelineDownload: vi.fn().mockResolvedValue({
      download: args.config,
      script,
    }),
    downloadToFile: vi.fn(async ({ url, filePath, isGzipped }) => {
      const body = (args.files ?? PAGES)[url] ?? '":id","county","cases"\n';
      await writeFile(filePath, isGzipped ? gzipSync(body) : body);
      return body.length;
    }),
    uploadPart: vi.fn(async ({ objectPath, partPath }) => {
      uploadedPaths.push(objectPath);
      await writeFile(
        join(args.bucketDir, basename(objectPath)),
        await readFile(partPath),
      );
    }),
    removeFolder: vi.fn(),
  };
}

async function _readBucket(
  bucketDir: string,
  sql: string,
): Promise<readonly unknown[]> {
  const db = new NodeDuckDb();
  try {
    return await db.runRawQuery(
      sql.replace("$copy", `read_parquet('${bucketDir}/*.parquet')`),
    );
  } finally {
    await db.close();
  }
}

describe("buildOpenDataParquetCache", () => {
  let bucketDir: string;

  beforeEach(async () => {
    bucketDir = join(
      tmpdir(),
      `odc-bucket-${Math.random().toString(36).slice(2)}`,
    );
    await mkdir(bucketDir);
  });

  afterEach(async () => {
    await rm(bucketDir, { force: true, recursive: true });
  });

  it("pages through the source and uploads every row, without the cursor", async () => {
    const dependencies = _createDependencies({
      config: { paging: true, pageRows: 2, script: "./download.ts" },
      download: _createPagedDownload(),
      bucketDir,
    });

    const copy = await buildOpenDataParquetCache({
      listing: LISTING,
      buildId: BUILD_ID,
      dependencies,
    });

    expect(dependencies.loadPipelineDownload).toHaveBeenCalledWith("example");
    expect(dependencies.script).toHaveBeenCalledWith({
      listing: LISTING,
      pageRows: 2,
    });
    expect(dependencies.downloadToFile).toHaveBeenCalledTimes(3);
    expect(copy).toEqual({
      folderPath: FOLDER,
      partCount: dependencies.uploadedPaths.length,
      sourceVersion: "v1",
      rowCount: 5,
      byteSize: expect.any(Number),
      columns: [
        { name: "county", dataType: "VARCHAR" },
        { name: "cases", dataType: "DOUBLE" },
      ],
    });
    expect(dependencies.uploadedPaths[0]).toBe(`${FOLDER}/part-00000.parquet`);
    expect(
      await _readBucket(bucketDir, "SELECT county FROM $copy ORDER BY cases"),
    ).toEqual([
      { county: "Kings" },
      { county: "Queens" },
      { county: "Bronx" },
      { county: "Richmond" },
      { county: "Erie" },
    ]);
    expect(await _readBucket(bucketDir, "SELECT * FROM $copy LIMIT 1")).toEqual(
      [{ county: expect.any(String), cases: expect.any(Number) }],
    );
  });

  it("uploads a part each time the staged pages reach the part size", async () => {
    const dependencies = _createDependencies({
      config: { paging: true, pageRows: 2, script: "./download.ts" },
      download: _createPagedDownload(),
      bucketDir,
    });

    const copy = await buildOpenDataParquetCache({
      listing: LISTING,
      buildId: BUILD_ID,
      dependencies,
      maxPartBytes: 1,
    });

    expect(copy.partCount).toBe(3);
    expect(dependencies.uploadedPaths).toEqual([
      `${FOLDER}/part-00000.parquet`,
      `${FOLDER}/part-00001.parquet`,
      `${FOLDER}/part-00002.parquet`,
    ]);
  });

  it("fails, and deletes what it uploaded, when the source changed while it downloaded", async () => {
    const dependencies = _createDependencies({
      config: { paging: true, pageRows: 2, script: "./download.ts" },
      download: _createPagedDownload({
        readSourceVersion: vi.fn().mockResolvedValue("v2"),
      }),
      bucketDir,
    });

    await expect(
      buildOpenDataParquetCache({
        listing: LISTING,
        buildId: BUILD_ID,
        dependencies,
      }),
    ).rejects.toMatchObject({ code: "source-changed" });
    expect(dependencies.removeFolder).toHaveBeenCalledWith(FOLDER);
  });

  it("fails on a source with no rows", async () => {
    const dependencies = _createDependencies({
      config: { paging: true, pageRows: 2, script: "./download.ts" },
      download: _createPagedDownload(),
      bucketDir,
      files: {},
    });

    await expect(
      buildOpenDataParquetCache({
        listing: LISTING,
        buildId: BUILD_ID,
        dependencies,
      }),
    ).rejects.toMatchObject({ code: "source-empty" });
  });

  it("retries a page whose download fails", async () => {
    const dependencies = _createDependencies({
      config: { paging: true, pageRows: 2, script: "./download.ts" },
      download: _createPagedDownload(),
      bucketDir,
    });
    const downloadToFile = dependencies.downloadToFile;
    let isFirstAttempt = true;
    dependencies.downloadToFile = vi.fn(async (args) => {
      if (isFirstAttempt) {
        isFirstAttempt = false;
        throw new Error("connection reset");
      }
      return await downloadToFile(args);
    });

    const copy = await buildOpenDataParquetCache({
      listing: LISTING,
      buildId: BUILD_ID,
      dependencies,
      pageRetryDelayMs: 0,
    });

    expect(copy.rowCount).toBe(5);
  });

  it("downloads a whole file, gzipped on disk, when the API does not page", async () => {
    const dependencies = _createDependencies({
      config: { paging: false, script: "./download.ts" },
      download: {
        paging: false,
        url: "file:whole",
        contentKind: "csv",
        sourceVersion: undefined,
      },
      bucketDir,
      files: { "file:whole": "country,cases\nChad,3\nMali,4\n" },
    });

    const copy = await buildOpenDataParquetCache({
      listing: LISTING,
      buildId: BUILD_ID,
      dependencies,
    });

    expect(dependencies.script).toHaveBeenCalledWith({
      listing: LISTING,
      pageRows: undefined,
    });
    expect(dependencies.downloadToFile).toHaveBeenCalledWith(
      expect.objectContaining({ url: "file:whole", isGzipped: true }),
    );
    expect(copy).toMatchObject({
      folderPath: FOLDER,
      partCount: 1,
      sourceVersion: expect.stringMatching(/^built:/),
      rowCount: 2,
      columns: [
        { name: "country", dataType: "VARCHAR" },
        { name: "cases", dataType: "BIGINT" },
      ],
    });
  });

  describe("a JSON source", () => {
    const JSON_DOWNLOAD: ListingDownload = {
      paging: false,
      url: "file:json",
      contentKind: "json",
      recordsField: "value",
      columns: [
        { name: "SpatialDim", dataType: "VARCHAR" },
        { name: "NumericValue", dataType: "DOUBLE" },
        { name: "Date", dataType: "TIMESTAMP" },
      ],
      sourceVersion: "from-script",
    };
    const JSON_FILES = {
      "file:json": JSON.stringify({
        value: [
          {
            SpatialDim: "SDN",
            NumericValue: 3,
            Date: "2016-09-21T13:42:00+02:00",
          },
          { SpatialDim: "TCD", NumericValue: 4, Date: "2017-01-01T00:00:00Z" },
        ],
      }),
    };

    it("downloads it gzipped and copies its rows with the declared types", async () => {
      const dependencies = _createDependencies({
        config: { paging: false, script: "./download.ts" },
        download: JSON_DOWNLOAD,
        bucketDir,
        files: JSON_FILES,
      });

      const copy = await buildOpenDataParquetCache({
        listing: LISTING,
        buildId: BUILD_ID,
        dependencies,
      });

      expect([
        vi.mocked(dependencies.downloadToFile).mock.calls[0]?.[0],
        copy.columns,
        await _readBucket(
          bucketDir,
          'SELECT SpatialDim, "Date"::VARCHAR AS d FROM $copy',
        ),
      ]).toEqual([
        expect.objectContaining({
          filePath: expect.stringMatching(/source\.json\.gz$/),
          isGzipped: true,
        }),
        [
          { name: "SpatialDim", dataType: "VARCHAR" },
          { name: "NumericValue", dataType: "DOUBLE" },
          { name: "Date", dataType: "TIMESTAMP" },
        ],
        [
          { SpatialDim: "SDN", d: "2016-09-21 11:42:00" },
          { SpatialDim: "TCD", d: "2017-01-01 00:00:00" },
        ],
      ]);
    });

    it("records the listing's probe token as the copy's source version, not the script's", async () => {
      const dependencies = _createDependencies({
        config: { paging: false, script: "./download.ts" },
        download: JSON_DOWNLOAD,
        bucketDir,
        files: JSON_FILES,
        probeCounts: [2],
      });

      const copy = await buildOpenDataParquetCache({
        listing: { ...LISTING, freshnessProbe: PROBE },
        buildId: BUILD_ID,
        dependencies,
      });

      expect(copy.sourceVersion).toBe("2");
    });

    it("fails, and deletes what it uploaded, when the probe token moved during the download", async () => {
      const dependencies = _createDependencies({
        config: { paging: false, script: "./download.ts" },
        download: JSON_DOWNLOAD,
        bucketDir,
        files: JSON_FILES,
        probeCounts: [2, 3],
      });

      await expect(
        buildOpenDataParquetCache({
          listing: { ...LISTING, freshnessProbe: PROBE },
          buildId: BUILD_ID,
          dependencies,
        }),
      ).rejects.toMatchObject({ code: "source-changed" });
      expect(dependencies.removeFolder).toHaveBeenCalledWith(FOLDER);
    });
  });

  it("refuses a script whose download does not match the config's paging", async () => {
    const dependencies = _createDependencies({
      config: { paging: false, script: "./download.ts" },
      download: _createPagedDownload(),
      bucketDir,
    });

    await expect(
      buildOpenDataParquetCache({
        listing: LISTING,
        buildId: BUILD_ID,
        dependencies,
      }),
    ).rejects.toThrow(/paging/);
  });

  it("deletes its temp files whether or not the build succeeds", async () => {
    let tempFilePath = "";
    const dependencies = _createDependencies({
      config: { paging: true, pageRows: 2, script: "./download.ts" },
      download: _createPagedDownload(),
      bucketDir,
    });
    const downloadToFile = dependencies.downloadToFile;
    dependencies.downloadToFile = vi.fn(async (args) => {
      tempFilePath = args.filePath;
      return await downloadToFile(args);
    });
    dependencies.uploadPart = vi
      .fn()
      .mockRejectedValue(new Error("storage is down"));

    await expect(
      buildOpenDataParquetCache({
        listing: LISTING,
        buildId: BUILD_ID,
        dependencies,
      }),
    ).rejects.toThrow("storage is down");
    await expect(access(tempFilePath)).rejects.toThrow();
  });
});

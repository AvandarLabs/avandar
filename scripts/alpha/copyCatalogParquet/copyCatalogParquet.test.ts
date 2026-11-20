import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  copyCatalogParquet,
  getCopyArgsRefusal,
  getCopySetupFromEnv,
  getListingIdFromCachePath,
  getTargetHostFromArgs,
} from "./copyCatalogParquet";
import type { CatalogParquetListing } from "./copyCatalogParquet";

/*
 * Tests for the catalog Parquet copy. The source and target are fake
 * Supabase projects whose `opendata` bucket behaves like Storage (folders
 * listed with a null `id`, paging by `offset`, an "already exists" error on
 * an upload with `upsert: false`) and that record every call the script is
 * not allowed to make.
 */

const LISTING_A = "0b6f6f7e-6a43-4b4e-9d0a-1f1f1f1f1f1a";
const LISTING_B = "0b6f6f7e-6a43-4b4e-9d0a-1f1f1f1f1f1b";
const PIPELINE_PATH = "world-bank__wdi/datasets/WDI_CSV.parquet";

type FakeStorageEntry = { name: string; id: string | null };

type FakeUpload = {
  path: string;
  options: { contentType?: string; cacheControl?: string; upsert?: boolean };
};

type FakeProjectOptions = {
  role: "source" | "target";
  objects?: Record<string, string>;
  listings?: readonly CatalogParquetListing[];
  hasBucket?: boolean;
  failingUploadPaths?: readonly string[];
};

function _sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function _cacheListing(
  overrides: Partial<CatalogParquetListing> = {},
): CatalogParquetListing {
  return {
    id: LISTING_A,
    access_kind: "api_resource",
    metadata: {},
    parquet_cache_status: "ready",
    parquet_cache_folder_path: `catalog-cache/${LISTING_A}/build-2`,
    parquet_cache_part_count: 1,
    ...overrides,
  };
}

function _pipelineListing(
  metadata: Record<string, unknown>,
): CatalogParquetListing {
  return {
    id: LISTING_B,
    access_kind: "pipeline_parquet",
    metadata: {
      open_data_bucket: "opendata",
      storage_object_path: PIPELINE_PATH,
      ...metadata,
    },
    parquet_cache_status: null,
    parquet_cache_folder_path: null,
    parquet_cache_part_count: null,
  };
}

function _listEntries(
  objects: ReadonlyMap<string, Uint8Array>,
  prefix: string,
): FakeStorageEntry[] {
  const folderPrefix = prefix === "" ? "" : `${prefix}/`;
  const entries = new Map<string, FakeStorageEntry>();
  [...objects.keys()]
    .filter((path) => {
      return path.startsWith(folderPrefix);
    })
    .forEach((path) => {
      const [name, ...rest] = path.slice(folderPrefix.length).split("/");
      entries.set(name!, { name: name!, id: rest.length === 0 ? path : null });
    });
  return [...entries.values()].sort((left, right) => {
    return left.name.localeCompare(right.name);
  });
}

/**
 * Wraps a fake so any property outside `allowed` records a violation and
 * throws, which is how the tests prove the script never writes to the
 * source and never does more than upload to the target.
 */
function _guard<T extends object>(
  target: T,
  allowed: readonly string[],
  violations: string[],
  label: string,
): T {
  return new Proxy(target, {
    get: (object, property) => {
      if (typeof property === "string" && !allowed.includes(property)) {
        violations.push(`${label}.${property}`);
        throw new Error(`${label}.${property} is not allowed`);
      }
      return Reflect.get(object, property);
    },
  });
}

function _createFakeBucket(
  options: FakeProjectOptions,
  objects: Map<string, Uint8Array>,
  calls: { uploads: FakeUpload[]; listedPrefixes: string[] },
) {
  return {
    list: async (
      prefix: string,
      listOptions: { limit: number; offset?: number },
    ) => {
      calls.listedPrefixes.push(prefix);
      if (options.hasBucket === false) {
        return { data: null, error: { message: "Bucket not found" } };
      }
      const offset = listOptions.offset ?? 0;
      return {
        data: _listEntries(objects, prefix).slice(
          offset,
          offset + listOptions.limit,
        ),
        error: null,
      };
    },
    download: async (path: string) => {
      const body = objects.get(path);
      return body === undefined
        ? { data: null, error: { message: "Object not found" } }
        : {
            data: {
              arrayBuffer: async () => {
                return body.slice().buffer;
              },
            },
            error: null,
          };
    },
    upload: async (
      path: string,
      body: ArrayBuffer,
      uploadOptions: FakeUpload["options"],
    ) => {
      if (options.failingUploadPaths?.includes(path)) {
        return { data: null, error: { message: "Gateway timeout" } };
      }
      if (objects.has(path) && uploadOptions.upsert !== true) {
        return {
          data: null,
          error: { message: "The resource already exists", statusCode: "409" },
        };
      }
      objects.set(path, new Uint8Array(body));
      calls.uploads.push({ path, options: uploadOptions });
      return { data: { path }, error: null };
    },
  };
}

/** A fake Supabase project: its `opendata` bucket and listing table. */
function _createFakeProject(options: FakeProjectOptions) {
  const violations: string[] = [];
  const uploads: FakeUpload[] = [];
  const listedPrefixes: string[] = [];
  const objects = new Map(
    Object.entries(options.objects ?? {}).map(([path, text]) => {
      return [path, new TextEncoder().encode(text)];
    }),
  );
  const bucketAllowed =
    options.role === "source"
      ? ["list", "download"]
      : ["list", "download", "upload"];
  const bucket = _guard(
    _createFakeBucket(options, objects, { uploads, listedPrefixes }),
    [...bucketAllowed, "then"],
    violations,
    `${options.role}.bucket`,
  );
  const listings = options.listings ?? [];
  const client = {
    storage: {
      from: (bucketName: string) => {
        expect(bucketName).toBe("opendata");
        return bucket;
      },
    },
    listListings: async (range: { from: number; to: number }) => {
      if (options.role === "source") {
        violations.push("source.listListings");
      }
      return { data: listings.slice(range.from, range.to + 1), error: null };
    },
  };
  return { client, objects, uploads, listedPrefixes, violations };
}

function _decode(body: Uint8Array | undefined): string | undefined {
  return body === undefined ? undefined : new TextDecoder().decode(body);
}

async function _copy(
  source: ReturnType<typeof _createFakeProject>,
  target: ReturnType<typeof _createFakeProject>,
) {
  return await copyCatalogParquet({
    source: source.client,
    target: target.client,
  });
}

describe("getListingIdFromCachePath", () => {
  it("reads the listing id from catalog-cache/<listing>/<build>/part-00000.parquet", () => {
    expect(
      getListingIdFromCachePath("catalog-cache/abc/build-1/part-00000.parquet"),
    ).toBe("abc");
  });

  it("returns undefined outside catalog-cache", () => {
    expect(getListingIdFromCachePath("workspaces/x/y.parquet")).toBeUndefined();
  });

  it("returns undefined for a folder name that only starts with catalog-cache", () => {
    expect(
      getListingIdFromCachePath("catalog-cache-old/abc/part-00000.parquet"),
    ).toBeUndefined();
  });
});

describe("copyCatalogParquet prebuilt copies", () => {
  it("copies only the build folder the listing names, with the cache upload options", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-1/part-00000.parquet`]: "old",
        [`catalog-cache/${LISTING_A}/build-2/part-00000.parquet`]: "new",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_cacheListing()],
    });

    await _copy(source, target);

    expect([...target.objects.keys()]).toEqual([
      `catalog-cache/${LISTING_A}/build-2/part-00000.parquet`,
    ]);
    expect(target.uploads[0]!.options).toEqual({
      contentType: "application/vnd.apache.parquet",
      cacheControl: "31536000",
      upsert: false,
    });
  });

  it("copies no object of a listing the target does not have", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-2/part-00000.parquet`]: "a",
        [`catalog-cache/${LISTING_B}/build-1/part-00000.parquet`]: "b",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_cacheListing()],
    });

    await _copy(source, target);

    expect(
      target.objects.has(
        `catalog-cache/${LISTING_B}/build-1/part-00000.parquet`,
      ),
    ).toBe(false);
  });

  it("copies every part of a build folder holding more than one list page", async () => {
    const objects = Object.fromEntries(
      Array.from({ length: 1005 }, (_value, index) => {
        const part = String(index).padStart(5, "0");
        return [
          `catalog-cache/${LISTING_A}/build-2/part-${part}.parquet`,
          part,
        ];
      }),
    );
    const source = _createFakeProject({ role: "source", objects });
    const target = _createFakeProject({
      role: "target",
      listings: [_cacheListing({ parquet_cache_part_count: 1005 })],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ copied: 1005, failed: 0 });
  });

  it("counts parts the target already has as present on a re-run", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-2/part-00000.parquet`]: "a",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_cacheListing()],
    });
    await _copy(source, target);

    const rerunCounts = await _copy(source, target);

    expect(rerunCounts).toEqual({
      listings: 1,
      copied: 0,
      alreadyPresent: 1,
      replaced: 0,
      failed: 0,
    });
  });

  it("keeps copying after an upload fails and counts the failure", async () => {
    const failingPath = `catalog-cache/${LISTING_A}/build-2/part-00000.parquet`;
    const source = _createFakeProject({
      role: "source",
      objects: {
        [failingPath]: "a0",
        [`catalog-cache/${LISTING_A}/build-2/part-00001.parquet`]: "a1",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_cacheListing({ parquet_cache_status: "failed" })],
      failingUploadPaths: [failingPath],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ copied: 1, failed: 1 });
  });

  it("fails a ready copy that ends with fewer parts in the target than parquet_cache_part_count", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-2/part-00000.parquet`]: "a",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_cacheListing({ parquet_cache_part_count: 3 })],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ copied: 1, failed: 1 });
  });

  it("fails a listing whose cache folder belongs to another listing, copying nothing", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_B}/build-1/part-00000.parquet`]: "b",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [
        _cacheListing({
          parquet_cache_folder_path: `catalog-cache/${LISTING_B}/build-1`,
        }),
      ],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ copied: 0, failed: 1 });
    expect(target.uploads).toEqual([]);
  });
});

describe("copyCatalogParquet pipeline_parquet objects", () => {
  it("copies a pipeline listing's object with the pipeline's upload options", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { [PIPELINE_PATH]: "wdi" },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_pipelineListing({ parquet_sha256: _sha256("wdi") })],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ copied: 1, failed: 0 });
    expect(_decode(target.objects.get(PIPELINE_PATH))).toBe("wdi");
    expect(target.uploads[0]!.options).toEqual({
      contentType: "application/vnd.apache.parquet",
      cacheControl: "3600",
      upsert: false,
    });
  });

  it("leaves a target object whose bytes match parquet_sha256 in place", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { [PIPELINE_PATH]: "wdi" },
    });
    const target = _createFakeProject({
      role: "target",
      objects: { [PIPELINE_PATH]: "wdi" },
      listings: [_pipelineListing({ parquet_sha256: _sha256("wdi") })],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ alreadyPresent: 1, replaced: 0 });
    expect(target.uploads).toEqual([]);
  });

  it("replaces a target object whose bytes differ from parquet_sha256", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { [PIPELINE_PATH]: "wdi" },
    });
    const target = _createFakeProject({
      role: "target",
      objects: { [PIPELINE_PATH]: "stale" },
      listings: [_pipelineListing({ parquet_sha256: _sha256("wdi") })],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ replaced: 1, failed: 0 });
    expect(_decode(target.objects.get(PIPELINE_PATH))).toBe("wdi");
  });

  it("finds the replaced object present on a re-run", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { [PIPELINE_PATH]: "wdi" },
    });
    const target = _createFakeProject({
      role: "target",
      objects: { [PIPELINE_PATH]: "stale" },
      listings: [_pipelineListing({ parquet_sha256: _sha256("wdi") })],
    });
    await _copy(source, target);

    const rerunCounts = await _copy(source, target);

    expect(rerunCounts).toMatchObject({ alreadyPresent: 1, replaced: 0 });
  });

  it("fails a source object whose bytes differ from parquet_sha256, writing nothing", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { [PIPELINE_PATH]: "corrupt" },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_pipelineListing({ parquet_sha256: _sha256("wdi") })],
    });

    const counts = await _copy(source, target);

    expect(counts).toMatchObject({ failed: 1 });
    expect(target.uploads).toEqual([]);
  });

  it.each([
    ["a bucket other than opendata", { open_data_bucket: "other" }],
    [
      "a path inside catalog-cache",
      { storage_object_path: `catalog-cache/${LISTING_A}/x.parquet` },
    ],
    [
      "a path that climbs out of its folder",
      { storage_object_path: "a/../../b.parquet" },
    ],
  ])(
    "fails a pipeline listing with %s, writing nothing",
    async (_name, metadata) => {
      const source = _createFakeProject({
        role: "source",
        objects: { [PIPELINE_PATH]: "wdi" },
      });
      const target = _createFakeProject({
        role: "target",
        listings: [_pipelineListing(metadata)],
      });

      const counts = await _copy(source, target);

      expect(counts).toMatchObject({ failed: 1 });
      expect(target.uploads).toEqual([]);
    },
  );
});

describe("copyCatalogParquet safety", () => {
  it("throws before listing the source when the target has no opendata bucket", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-2/part-00000.parquet`]: "a",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listings: [_cacheListing()],
      hasBucket: false,
    });

    await expect(_copy(source, target)).rejects.toThrow(/opendata/);
    expect(source.listedPrefixes).toEqual([]);
  });

  it("throws when the target has no listings, as when the import has not run", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { [PIPELINE_PATH]: "wdi" },
    });
    const target = _createFakeProject({ role: "target", listings: [] });

    await expect(_copy(source, target)).rejects.toThrow(/importCatalogData/);
  });

  it("only reads the source, and upserts only a pipeline object whose SHA-256 differs", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-2/part-00000.parquet`]: "a0",
        [`catalog-cache/${LISTING_A}/build-2/part-00001.parquet`]: "a1",
        [PIPELINE_PATH]: "wdi",
      },
    });
    const target = _createFakeProject({
      role: "target",
      objects: {
        [`catalog-cache/${LISTING_A}/build-2/part-00000.parquet`]: "",
        [PIPELINE_PATH]: "stale",
      },
      listings: [
        _cacheListing({ parquet_cache_part_count: 2 }),
        _pipelineListing({ parquet_sha256: _sha256("wdi") }),
      ],
    });

    const counts = await _copy(source, target);

    // Precondition: the run copied, found, and replaced an object, so every
    // path through the copy was taken.
    expect(counts).toEqual({
      listings: 2,
      copied: 1,
      alreadyPresent: 1,
      replaced: 1,
      failed: 0,
    });
    expect([...source.violations, ...target.violations]).toEqual([]);
    expect(
      target.uploads
        .filter((upload) => {
          return upload.options.upsert;
        })
        .map((upload) => {
          return upload.path;
        }),
    ).toEqual([PIPELINE_PATH]);
  });
});

describe("getCopySetupFromEnv", () => {
  const env = {
    SOURCE_SUPABASE_URL: "https://source-ref.supabase.co",
    SOURCE_SECRET_KEY: "source-key",
    TARGET_SUPABASE_URL: "https://target-ref.supabase.co",
    TARGET_SECRET_KEY: "target-key",
  };

  it("returns both hosts when every variable is set", () => {
    expect(getCopySetupFromEnv(env)).toMatchObject({
      isRefused: false,
      setup: {
        sourceHost: "source-ref.supabase.co",
        targetHost: "target-ref.supabase.co",
      },
    });
  });

  it("refuses when a key is missing", () => {
    expect(
      getCopySetupFromEnv({ ...env, TARGET_SECRET_KEY: undefined }),
    ).toMatchObject({
      isRefused: true,
      reason: expect.stringMatching(/TARGET_SECRET_KEY/),
    });
  });

  it("refuses when the source and target are the same project", () => {
    expect(
      getCopySetupFromEnv({
        ...env,
        TARGET_SUPABASE_URL: "https://source-ref.supabase.co/",
      }),
    ).toMatchObject({ isRefused: true, reason: expect.stringMatching(/same/) });
  });

  it("allows the same host on another port, which is another project", () => {
    expect(
      getCopySetupFromEnv({
        ...env,
        SOURCE_SUPABASE_URL: "http://127.0.0.1:54321",
        TARGET_SUPABASE_URL: "http://127.0.0.1:55421",
      }),
    ).toMatchObject({
      isRefused: false,
      setup: { sourceHost: "127.0.0.1:54321", targetHost: "127.0.0.1:55421" },
    });
  });

  it("refuses a URL that cannot be parsed", () => {
    expect(
      getCopySetupFromEnv({ ...env, TARGET_SUPABASE_URL: "not a url" }),
    ).toMatchObject({
      isRefused: true,
      reason: expect.stringMatching(/TARGET_SUPABASE_URL/),
    });
  });
});

describe("getTargetHostFromArgs", () => {
  it("reads the host after --yes-i-know-the-target", () => {
    expect(
      getTargetHostFromArgs(["--yes-i-know-the-target", "target.supabase.co"]),
    ).toBe("target.supabase.co");
  });

  it("returns undefined when another flag follows in place of a host", () => {
    expect(
      getTargetHostFromArgs(["--yes-i-know-the-target", "--dry-run"]),
    ).toBeUndefined();
  });

  it("returns undefined when the flag has no value", () => {
    expect(getTargetHostFromArgs(["--yes-i-know-the-target"])).toBeUndefined();
  });
});

describe("getCopyArgsRefusal", () => {
  it.each([
    ["no arguments", []],
    ["the target confirmation", ["--yes-i-know-the-target", "t.supabase.co"]],
  ])("accepts %s", (_name, args) => {
    expect(getCopyArgsRefusal(args)).toBeUndefined();
  });

  it.each([
    ["--dry-run", ["--dry-run"]],
    [
      "an argument after the confirmation",
      ["--yes-i-know-the-target", "t.supabase.co", "--dry-run"],
    ],
    ["a bare host", ["t.supabase.co"]],
  ])("refuses %s", (_name, args) => {
    expect(getCopyArgsRefusal(args)).toMatch(/Unknown arguments/);
  });
});

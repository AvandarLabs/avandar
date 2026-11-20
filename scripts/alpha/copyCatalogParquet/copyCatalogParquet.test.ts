import { describe, expect, it } from "vitest";
import {
  copyCatalogParquet,
  getCopySetupFromEnv,
  getListingIdFromCachePath,
  getTargetHostFromArgs,
} from "./copyCatalogParquet";

/*
 * Tests for the catalog Parquet copy. The source and target are fake
 * Supabase clients that behave like Storage (folders listed with a null
 * `id`, paging by `offset`, an "already exists" error on an upload with
 * `upsert: false`) and record every call the script is not allowed to make.
 */

const LISTING_A = "0b6f6f7e-6a43-4b4e-9d0a-1f1f1f1f1f1a";
const LISTING_B = "0b6f6f7e-6a43-4b4e-9d0a-1f1f1f1f1f1b";

type FakeStorageEntry = { name: string; id: string | null };

type FakeUpload = {
  path: string;
  body: Uint8Array;
  options: { contentType?: string; cacheControl?: string; upsert?: boolean };
};

type FakeProjectOptions = {
  role: "source" | "target";
  objects?: Record<string, string>;
  listingIds?: readonly string[];
  hasBucket?: boolean;
  failingUploadPaths?: readonly string[];
};

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
  const { uploads } = calls;
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
      const entries = _listEntries(objects, prefix);
      return {
        data: entries.slice(offset, offset + listOptions.limit),
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
          error: {
            message: "The resource already exists",
            statusCode: "409",
          },
        };
      }
      objects.set(path, new Uint8Array(body));
      uploads.push({
        path,
        body: new Uint8Array(body),
        options: uploadOptions,
      });
      return { data: { path }, error: null };
    },
  };
}

function _createFakeDatabase(listingIds: readonly string[]) {
  return {
    select: (columns: string) => {
      return {
        eq: async (column: string, value: string) => {
          expect([columns, column]).toEqual(["id", "id"]);
          return {
            data: listingIds.includes(value) ? [{ id: value }] : [],
            error: null,
          };
        },
      };
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
    options.role === "source" ? ["list", "download"] : ["list", "upload"];
  const bucket = _guard(
    _createFakeBucket(options, objects, { uploads, listedPrefixes }),
    [...bucketAllowed, "then"],
    violations,
    `${options.role}.bucket`,
  );
  const database = _guard(
    _createFakeDatabase(options.listingIds ?? []),
    ["select", "then"],
    violations,
    `${options.role}.table`,
  );
  const client = {
    storage: {
      from: (bucketName: string) => {
        expect(bucketName).toBe("opendata");
        return bucket;
      },
    },
    from: (table: string) => {
      if (options.role === "source") {
        violations.push(`source.from(${table})`);
      }
      expect(table).toBe("data_catalog_listings");
      return database;
    },
  };
  return { client, objects, uploads, listedPrefixes, violations };
}

function _decode(body: Uint8Array | undefined): string | undefined {
  return body === undefined ? undefined : new TextDecoder().decode(body);
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

describe("copyCatalogParquet", () => {
  it("copies each object of a target listing to the same path with the Parquet upload options", async () => {
    const path = `catalog-cache/${LISTING_A}/build-1/part-00000.parquet`;
    const source = _createFakeProject({
      role: "source",
      objects: { [path]: "parquet-a" },
    });
    const target = _createFakeProject({
      role: "target",
      listingIds: [LISTING_A],
    });

    const counts = await copyCatalogParquet({
      source: source.client,
      target: target.client,
    });

    expect(counts).toEqual({
      copied: 1,
      alreadyPresent: 0,
      skipped: 0,
      failed: 0,
    });
    expect(_decode(target.objects.get(path))).toBe("parquet-a");
    expect(target.uploads[0]!.options).toEqual({
      contentType: "application/vnd.apache.parquet",
      cacheControl: "31536000",
      upsert: false,
    });
  });

  it("skips every object of a listing the target does not have", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-1/part-00000.parquet`]: "a",
        [`catalog-cache/${LISTING_B}/build-1/part-00000.parquet`]: "b0",
        [`catalog-cache/${LISTING_B}/build-1/part-00001.parquet`]: "b1",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listingIds: [LISTING_A],
    });

    const counts = await copyCatalogParquet({
      source: source.client,
      target: target.client,
    });

    expect(counts).toMatchObject({ copied: 1, skipped: 2 });
    expect(
      target.uploads.map((upload) => {
        return upload.path;
      }),
    ).toEqual([`catalog-cache/${LISTING_A}/build-1/part-00000.parquet`]);
  });

  it("skips a cache folder whose name is not a listing id", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { "catalog-cache/not-a-uuid/build-1/part-00000.parquet": "x" },
    });
    const target = _createFakeProject({ role: "target", listingIds: [] });

    const counts = await copyCatalogParquet({
      source: source.client,
      target: target.client,
    });

    expect(counts).toMatchObject({ copied: 0, skipped: 1 });
  });

  it("copies every part of a build folder holding more than one list page", async () => {
    const objects = Object.fromEntries(
      Array.from({ length: 1005 }, (_value, index) => {
        const part = String(index).padStart(5, "0");
        return [
          `catalog-cache/${LISTING_A}/build-1/part-${part}.parquet`,
          part,
        ];
      }),
    );
    const source = _createFakeProject({ role: "source", objects });
    const target = _createFakeProject({
      role: "target",
      listingIds: [LISTING_A],
    });

    const counts = await copyCatalogParquet({
      source: source.client,
      target: target.client,
    });

    expect(counts.copied).toBe(1005);
    expect(target.objects.size).toBe(1005);
  });

  it("counts objects the target already has as present on a re-run", async () => {
    const objects = {
      [`catalog-cache/${LISTING_A}/build-1/part-00000.parquet`]: "a0",
      [`catalog-cache/${LISTING_A}/build-1/part-00001.parquet`]: "a1",
    };
    const source = _createFakeProject({ role: "source", objects });
    const target = _createFakeProject({
      role: "target",
      listingIds: [LISTING_A],
    });
    await copyCatalogParquet({ source: source.client, target: target.client });

    const rerunCounts = await copyCatalogParquet({
      source: source.client,
      target: target.client,
    });

    expect(rerunCounts).toEqual({
      copied: 0,
      alreadyPresent: 2,
      skipped: 0,
      failed: 0,
    });
  });

  it("keeps copying after an upload fails and counts the failure", async () => {
    const failingPath = `catalog-cache/${LISTING_A}/build-1/part-00000.parquet`;
    const source = _createFakeProject({
      role: "source",
      objects: {
        [failingPath]: "a0",
        [`catalog-cache/${LISTING_A}/build-1/part-00001.parquet`]: "a1",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listingIds: [LISTING_A],
      failingUploadPaths: [failingPath],
    });

    const counts = await copyCatalogParquet({
      source: source.client,
      target: target.client,
    });

    expect(counts).toMatchObject({ copied: 1, failed: 1 });
  });

  it("throws before listing the source when the target has no opendata bucket", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: { [`catalog-cache/${LISTING_A}/b/part-00000.parquet`]: "a" },
    });
    const target = _createFakeProject({
      role: "target",
      listingIds: [LISTING_A],
      hasBucket: false,
    });

    await expect(
      copyCatalogParquet({ source: source.client, target: target.client }),
    ).rejects.toThrow(/opendata/);
    expect(source.listedPrefixes).toEqual([]);
  });

  it("only reads the source and only uploads to the target", async () => {
    const source = _createFakeProject({
      role: "source",
      objects: {
        [`catalog-cache/${LISTING_A}/build-1/part-00000.parquet`]: "a0",
        [`catalog-cache/${LISTING_A}/build-1/part-00001.parquet`]: "a1",
        [`catalog-cache/${LISTING_B}/build-1/part-00000.parquet`]: "b",
      },
    });
    const target = _createFakeProject({
      role: "target",
      listingIds: [LISTING_A],
      objects: {
        [`catalog-cache/${LISTING_A}/build-1/part-00000.parquet`]: "",
      },
    });

    const counts = await copyCatalogParquet({
      source: source.client,
      target: target.client,
    });

    // Precondition: the run copied, found, and skipped an object, so every
    // path through the copy was taken.
    expect(counts).toEqual({
      copied: 1,
      alreadyPresent: 1,
      skipped: 1,
      failed: 0,
    });
    expect([...source.violations, ...target.violations]).toEqual([]);
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

import { describe, expect, it, vi } from "vitest";
import { createAvandarSupabaseStorageClient } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.ts";
import type { SupabaseStorageBucketHandle } from "$/connectors/open-data/AvandarSupabaseStorageClient/AvandarSupabaseStorageClient.types.ts";

function _handle(
  overrides: Partial<SupabaseStorageBucketHandle> = {},
): SupabaseStorageBucketHandle {
  return {
    download: vi.fn(async () => {
      return { data: new Blob(["cached"]), error: null };
    }),
    upload: vi.fn(async () => {
      return { error: null };
    }),
    remove: vi.fn(async () => {
      return { error: null };
    }),
    ...overrides,
  };
}

describe("AvandarSupabaseStorageClient.downloadCachedResource", () => {
  it("reads the object at the given path", async () => {
    const handle = _handle();

    const blob =
      await createAvandarSupabaseStorageClient(handle).downloadCachedResource(
        "aaaaaaaa.parquet",
      );

    expect(handle.download).toHaveBeenCalledWith("aaaaaaaa.parquet");
    expect(blob).toBeInstanceOf(Blob);
  });

  it("returns undefined rather than throwing when the object is missing", async () => {
    const handle = _handle({
      download: vi.fn(async () => {
        return { data: null, error: { message: "not found" } };
      }),
    });

    const blob =
      await createAvandarSupabaseStorageClient(handle).downloadCachedResource(
        "missing.parquet",
      );

    expect(blob).toBeUndefined();
  });
});

describe("AvandarSupabaseStorageClient.uploadCachedResource", () => {
  it("uploads with upsert so a re-cache overwrites cleanly", async () => {
    const handle = _handle();
    const blob = new Blob(["bytes"]);

    await createAvandarSupabaseStorageClient(handle).uploadCachedResource(
      "aaaaaaaa.csv",
      blob,
    );

    expect(handle.upload).toHaveBeenCalledWith("aaaaaaaa.csv", blob, {
      contentType: "application/octet-stream",
      upsert: true,
    });
  });

  it("throws when the upload fails", async () => {
    const handle = _handle({
      upload: vi.fn(async () => {
        return { error: { message: "disk full" } };
      }),
    });

    await expect(
      createAvandarSupabaseStorageClient(handle).uploadCachedResource(
        "aaaaaaaa.csv",
        new Blob(["bytes"]),
      ),
    ).rejects.toThrow("disk full");
  });
});

describe("AvandarSupabaseStorageClient.removeCachedResource", () => {
  it("removes the object at the given path", async () => {
    const handle = _handle();

    await createAvandarSupabaseStorageClient(handle).removeCachedResource(
      "aaaaaaaa.parquet",
    );

    expect(handle.remove).toHaveBeenCalledWith(["aaaaaaaa.parquet"]);
  });
});

import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseParquetCopyStore } from "@pipeline-server/openDataParquetCache/createSupabaseParquetCopyStore/createSupabaseParquetCopyStore";

const { uploadMock } = vi.hoisted(() => {
  return { uploadMock: vi.fn() };
});

vi.mock("@supabase/supabase-js", () => {
  return {
    createClient: () => {
      return {
        storage: {
          from: () => {
            return { upload: uploadMock };
          },
        },
      };
    },
  };
});

describe("createSupabaseParquetCopyStore", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "parquet-copy-store-"));
    uploadMock.mockReset();
    uploadMock.mockResolvedValue({ error: null });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("uploads a part as Parquet that browsers may cache for a year", async () => {
    const partPath = join(tempDir, "part-00000.parquet");
    await writeFile(partPath, "parquet bytes");
    const store = createSupabaseParquetCopyStore({
      url: "http://localhost:54321",
      serviceRoleKey: "service-role-key",
    });

    await store.uploadPart({
      objectPath: "catalog-cache/listing/build/part-00000.parquet",
      partPath,
    });

    expect(uploadMock).toHaveBeenCalledWith(
      "catalog-cache/listing/build/part-00000.parquet",
      expect.anything(),
      {
        contentType: "application/vnd.apache.parquet",
        cacheControl: "31536000",
        upsert: true,
      },
    );
  });
});

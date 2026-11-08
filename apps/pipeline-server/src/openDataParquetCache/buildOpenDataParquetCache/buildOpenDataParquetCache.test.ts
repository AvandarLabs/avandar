import { access, readFile, writeFile } from "node:fs/promises";
import { buildOpenDataParquetCache } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";
import { convertCsvFileToParquetFile } from "@pipeline-server/openDataParquetCache/convertCsvFileToParquetFile/convertCsvFileToParquetFile";
import { describe, expect, it, vi } from "vitest";
import type { OpenDataParquetCacheDependencies } from "@pipeline-server/openDataParquetCache/buildOpenDataParquetCache/buildOpenDataParquetCache";

const LISTING_ID = "5b89fc55-586d-485f-8526-3c7a9a1b0d90";

function _createDependencies(
  overrides: Partial<OpenDataParquetCacheDependencies> = {},
): OpenDataParquetCacheDependencies {
  return {
    resolveSourceDownload: vi.fn().mockResolvedValue({
      url: "https://data.example.org/op.csv",
      contentKind: "csv",
      sourceVersion: "v2",
    }),
    downloadToFile: vi.fn(async ({ filePath }: { filePath: string }) => {
      await writeFile(filePath, "country,cases\nChad,3\nMali,4\n", "utf8");
      return 28;
    }),
    convertCsvToParquet: convertCsvFileToParquetFile,
    uploadParquet: vi.fn(async ({ parquetPath }: { parquetPath: string }) => {
      // The file must still exist while it uploads.
      await readFile(parquetPath);
    }),
    removeObject: vi.fn(),
    ...overrides,
  };
}

describe("buildOpenDataParquetCache", () => {
  it("converts the source to Parquet and uploads it under its version", async () => {
    const dependencies = _createDependencies();

    const result = await buildOpenDataParquetCache({
      catalogListingId: LISTING_ID,
      previousObjectPath: undefined,
      dependencies,
    });

    expect(dependencies.resolveSourceDownload).toHaveBeenCalled();
    expect(dependencies.uploadParquet).toHaveBeenCalledWith({
      objectPath: result.objectPath,
      parquetPath: expect.stringMatching(/\.parquet$/),
    });
    expect(result).toEqual({
      objectPath: expect.stringMatching(
        new RegExp(`^catalog-cache/${LISTING_ID}/[0-9a-f]{16}\\.parquet$`),
      ),
      sourceVersion: "v2",
      rowCount: 2,
      byteSize: expect.any(Number),
      columns: [
        { name: "country", dataType: "VARCHAR" },
        { name: "cases", dataType: "BIGINT" },
      ],
    });
    expect(dependencies.removeObject).not.toHaveBeenCalled();
  });

  it("removes the previous copy once the new one is uploaded", async () => {
    const dependencies = _createDependencies();

    await buildOpenDataParquetCache({
      catalogListingId: LISTING_ID,
      previousObjectPath: `catalog-cache/${LISTING_ID}/0000000000000000.parquet`,
      dependencies,
    });

    expect(dependencies.removeObject).toHaveBeenCalledWith(
      `catalog-cache/${LISTING_ID}/0000000000000000.parquet`,
    );
  });

  it("uploads a Parquet source without converting it", async () => {
    const convertCsvToParquet = vi.fn();
    const dependencies = _createDependencies({
      resolveSourceDownload: vi.fn().mockResolvedValue({
        url: "https://data.example.org/op.parquet",
        contentKind: "parquet",
        sourceVersion: "v2",
      }),
      downloadToFile: vi.fn(async ({ filePath }: { filePath: string }) => {
        // A real Parquet file, written by the converter, stands in for the
        // downloaded source.
        const csvPath = `${filePath}.csv`;
        await writeFile(csvPath, "a\n1\n", "utf8");
        await convertCsvFileToParquetFile({ csvPath, parquetPath: filePath });
        return 1;
      }),
      convertCsvToParquet,
    });

    const result = await buildOpenDataParquetCache({
      catalogListingId: LISTING_ID,
      previousObjectPath: undefined,
      dependencies,
    });

    expect(convertCsvToParquet).not.toHaveBeenCalled();
    expect(result.rowCount).toBe(1);
  });

  it("deletes its temp files whether or not the build succeeds", async () => {
    let tempFilePath = "";
    const dependencies = _createDependencies({
      downloadToFile: vi.fn(async ({ filePath }: { filePath: string }) => {
        tempFilePath = filePath;
        await writeFile(filePath, "a\n1\n", "utf8");
        return 4;
      }),
      uploadParquet: vi.fn().mockRejectedValue(new Error("storage is down")),
    });

    await expect(
      buildOpenDataParquetCache({
        catalogListingId: LISTING_ID,
        previousObjectPath: undefined,
        dependencies,
      }),
    ).rejects.toThrow("storage is down");
    await expect(access(tempFilePath)).rejects.toThrow();
  });
});

import { loadPipelineListingDownload } from "@pipeline-server/openDataParquetCache/loadPipelineListingDownload/loadPipelineListingDownload";
import { describe, expect, it } from "vitest";

describe("loadPipelineListingDownload", () => {
  it("loads a paging pipeline's download config and script", async () => {
    const { download, script } = await loadPipelineListingDownload("socrata");

    expect(download).toMatchObject({
      paging: true,
      pageRows: expect.any(Number),
    });
    expect(script).toBeTypeOf("function");
  });

  it("loads a pipeline whose API does not page", async () => {
    const { download } = await loadPipelineListingDownload("hdx");

    expect(download.paging).toBe(false);
  });

  it("refuses a pipeline whose config has no download block", async () => {
    await expect(
      loadPipelineListingDownload("world-bank__wdi"),
    ).rejects.toThrow(/world-bank__wdi/);
  });

  it("refuses a pipeline name that is not a folder name", async () => {
    await expect(loadPipelineListingDownload("../hdx")).rejects.toThrow(
      /may only hold/,
    );
  });
});

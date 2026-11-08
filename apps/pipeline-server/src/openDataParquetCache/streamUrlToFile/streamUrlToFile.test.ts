import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { streamUrlToFile } from "@pipeline-server/openDataParquetCache/streamUrlToFile/streamUrlToFile";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("streamUrlToFile", () => {
  let testRoot: string;

  beforeEach(async () => {
    testRoot = await mkdtemp(join(tmpdir(), "odc-stream-"));
  });

  afterEach(async () => {
    await rm(testRoot, { force: true, recursive: true });
  });

  it("writes the response body to the file and returns its size", async () => {
    const filePath = join(testRoot, "source.csv");
    const fetchUrl = vi.fn().mockResolvedValue(new Response("a,b\n1,2\n"));

    const byteSize = await streamUrlToFile({
      url: "https://data.example.org/a.csv",
      filePath,
      fetchUrl,
    });

    expect(fetchUrl).toHaveBeenCalledWith("https://data.example.org/a.csv");
    expect(await readFile(filePath, "utf8")).toBe("a,b\n1,2\n");
    expect(byteSize).toBe(8);
  });

  it("gzips the body as it is written, when asked", async () => {
    const filePath = join(testRoot, "source.csv.gz");
    const body = "a,b\n".repeat(10_000);
    const fetchUrl = vi.fn().mockResolvedValue(new Response(body));

    const byteSize = await streamUrlToFile({
      url: "https://data.example.org/a.csv",
      filePath,
      fetchUrl,
      isGzipped: true,
    });

    const written = await readFile(filePath);
    expect(gunzipSync(written).toString("utf8")).toBe(body);
    expect(byteSize).toBe(written.byteLength);
    expect(byteSize).toBeLessThan(body.length);
  });

  it("throws with the status when the source refuses", async () => {
    const fetchUrl = vi
      .fn()
      .mockResolvedValue(new Response("gone", { status: 404 }));

    await expect(
      streamUrlToFile({
        url: "https://data.example.org/a.csv",
        filePath: join(testRoot, "source.csv"),
        fetchUrl,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

import { gzipBytes } from "@sbfn/open-data/gzipBytes/gzipBytes.ts";
import { describe, expect, it } from "vitest";

async function _gunzip(bytes: Uint8Array): Promise<string> {
  const decompressed = new Response(bytes as BodyInit).body?.pipeThrough(
    new DecompressionStream("gzip"),
  );
  return await new Response(decompressed).text();
}

describe("gzipBytes", () => {
  it("compresses bytes that gunzip back to the same text", async () => {
    const text = "region;amount\nNord;1\n".repeat(200);

    const compressed = await gzipBytes(new TextEncoder().encode(text));

    expect([
      await _gunzip(compressed),
      compressed.byteLength < text.length,
    ]).toEqual([text, true]);
  });
});

import { createByteRangeReader } from "@sbfn/open-data/readByteRangeOverHttp/readByteRangeOverHttp.ts";
import { describe, expect, it, vi } from "vitest";

describe("createByteRangeReader", () => {
  it("asks for the first maxBytes", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response("abc", { status: 206 });
    });

    await createByteRangeReader(fetchImpl as unknown as typeof fetch)({
      url: "https://data.humdata.org/file.csv",
      maxBytes: 3,
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://data.humdata.org/file.csv",
      expect.objectContaining({ headers: { Range: "bytes=0-2" } }),
    );
  });

  it("keeps only maxBytes when the server ignores the range", async () => {
    const bytes = await createByteRangeReader((async () => {
      return new Response("abcdefgh", { status: 200 });
    }) as unknown as typeof fetch)({
      url: "https://data.humdata.org/file.csv",
      maxBytes: 3,
    });

    expect(new TextDecoder().decode(bytes)).toBe("abc");
  });

  it("returns a file shorter than maxBytes whole", async () => {
    const bytes = await createByteRangeReader((async () => {
      return new Response("ab", { status: 200 });
    }) as unknown as typeof fetch)({
      url: "https://data.humdata.org/file.csv",
      maxBytes: 10,
    });

    expect(new TextDecoder().decode(bytes)).toBe("ab");
  });

  it("fails on an error status", async () => {
    await expect(
      createByteRangeReader((async () => {
        return new Response("nope", { status: 404 });
      }) as unknown as typeof fetch)({
        url: "https://data.humdata.org/file.csv",
        maxBytes: 10,
      }),
    ).rejects.toThrow("HTTP 404");
  });
});

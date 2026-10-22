import {
  createSocrataCsvHeaderReader,
  parseCsvHeaderLine,
} from "@pipelines/socrata/createSocrataCsvHeaderReader/createSocrataCsvHeaderReader";
import { describe, expect, it, vi } from "vitest";

const DRIVE = {
  baseUrl: "https://data.cityofnewyork.us",
  organizationName: "City of New York",
};

function _response(status: number, body: string): Response {
  return new Response(body, { status });
}

describe("parseCsvHeaderLine", () => {
  it.each([
    ['"a","b","c"\n', ["a", "b", "c"]],
    ["a,b,c", ["a", "b", "c"]],
    ['"a, b","say ""hi""",c\r\n1,2,3', ["a, b", 'say "hi"', "c"]],
    ['"line\nbreak",b\n', ["line\nbreak", "b"]],
  ])("parses %j", (text, expected) => {
    expect(parseCsvHeaderLine(text)).toEqual(expected);
  });
});

describe("createSocrataCsvHeaderReader", () => {
  it("asks the drive for the export's header only, with the app token", async () => {
    const fetchImpl = vi.fn(async () => {
      return _response(200, '"business_name","borough"\n');
    });

    const header = await createSocrataCsvHeaderReader({
      appToken: "token-1",
      fetchImpl,
    })({ drive: DRIVE, datasetId: "799n-b76v" });

    expect(header).toEqual(["business_name", "borough"]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://data.cityofnewyork.us/resource/799n-b76v.csv?%24limit=0",
      expect.objectContaining({ headers: { "X-App-Token": "token-1" } }),
    );
  });

  it("returns undefined for a dataset with no CSV export", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const header = await createSocrataCsvHeaderReader({
      appToken: undefined,
      fetchImpl: async () => {
        return _response(403, '{"error":true}');
      },
    })({ drive: DRIVE, datasetId: "q663-gvx6" });

    expect(header).toBeUndefined();
  });

  it("returns undefined when the request fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const header = await createSocrataCsvHeaderReader({
      appToken: undefined,
      fetchImpl: async () => {
        throw new Error("network down");
      },
    })({ drive: DRIVE, datasetId: "q663-gvx6" });

    expect(header).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { readHdxFileHeaders } from "$/connectors/open-data/CkanClient/readHdxFileHeaders/readHdxFileHeaders.ts";

function _check(sheets: unknown[]): Record<string, unknown> {
  return {
    state: "success",
    hxl_proxy_response: { format: "CSV", sheets },
  };
}

function _sheet(headers: unknown): Record<string, unknown> {
  return { name: "__DEFAULT__", nrows: 10, ncols: 2, headers };
}

describe("readHdxFileHeaders", () => {
  it("reads the headers of a check stored as a JSON string, as HDX sends it", () => {
    expect(
      readHdxFileHeaders(JSON.stringify([_check([_sheet(["adm1", "value"])])])),
    ).toEqual(["adm1", "value"]);
  });

  it("reads the headers of a check stored as an array", () => {
    expect(readHdxFileHeaders([_check([_sheet(["adm1"])])])).toEqual(["adm1"]);
  });

  it("takes the newest check that read headers", () => {
    expect(
      readHdxFileHeaders([
        _check([_sheet(["old"])]),
        _check([_sheet(["new"])]),
        { state: "failure", message: "File structure check failed" },
      ]),
    ).toEqual(["new"]);
  });

  it.each([
    ["nothing", undefined],
    ["text that is not JSON", "not json"],
    ["a check with no proxy response", [{ state: "success" }]],
    ["a file with several sheets", [_check([_sheet(["a"]), _sheet(["b"])])]],
    ["no headers", [_check([_sheet(undefined)])]],
    ["an empty header list", [_check([_sheet([])])]],
    ["a header that is not text", [_check([_sheet(["a", 2])])]],
  ])("returns undefined for %s", (_label, fsCheckInfo) => {
    expect(readHdxFileHeaders(fsCheckInfo)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { buildHTTPQueryString } from "$/utils/urls/buildHTTPQueryString";

describe("buildHTTPQueryString", () => {
  it("writes a number as digits, never as a formatted number", () => {
    // `unknownToString` formats numbers for display by default, which in a URL
    // means a Google Sheets `gid` of 988142735 goes out as `988,142,735`, with
    // a separator that changes with the runtime's locale.
    expect(buildHTTPQueryString({ gid: 988_142_735 })).toBe("gid=988142735");
  });

  it("encodes values that are not URL-safe", () => {
    expect(buildHTTPQueryString({ fields: "a.b(c,d)" })).toBe(
      "fields=a.b(c%2Cd)",
    );
  });

  it("omits an undefined value rather than sending an empty one", () => {
    expect(buildHTTPQueryString({ a: "1", b: undefined })).toBe("a=1");
  });

  it("is empty for no params", () => {
    expect(buildHTTPQueryString({})).toBe("");
    expect(buildHTTPQueryString(undefined)).toBe("");
  });
});

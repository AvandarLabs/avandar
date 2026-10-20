import { describe, expect, it } from "vitest";
import { parseCkanTimestamp } from "$/connectors/open-data/parseCkanTimestamp/parseCkanTimestamp.ts";

describe("parseCkanTimestamp", () => {
  it("reads a naive microsecond timestamp as UTC", () => {
    expect(
      parseCkanTimestamp("2026-10-20T13:47:48.858245").toISOString(),
    ).toBe("2026-10-20T13:47:48.858Z");
  });

  it("keeps an explicit Z", () => {
    expect(parseCkanTimestamp("2026-10-20T13:47:48.858Z").toISOString()).toBe(
      "2026-10-20T13:47:48.858Z",
    );
  });

  it("reads a timestamp with no fraction", () => {
    expect(parseCkanTimestamp("2026-10-20T13:47:48").toISOString()).toBe(
      "2026-10-20T13:47:48.000Z",
    );
  });

  it("throws on a value that is not a timestamp", () => {
    expect(() => {
      return parseCkanTimestamp("yesterday");
    }).toThrow("Not a CKAN timestamp");
  });
});

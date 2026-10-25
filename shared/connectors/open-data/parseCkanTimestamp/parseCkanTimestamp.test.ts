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

  it("truncates microseconds instead of rounding them", () => {
    expect(
      parseCkanTimestamp("2021-07-23T08:57:33.999838").toISOString(),
    ).toBe("2021-07-23T08:57:33.999Z");
  });

  it("applies an explicit offset", () => {
    expect(
      parseCkanTimestamp("2026-10-20T15:47:48.858+02:00").toISOString(),
    ).toBe("2026-10-20T13:47:48.858Z");
  });

  it.each(["yesterday", "2026", "12", "2026-10-20", "2026-13-01T00:00:00"])(
    "throws on %j, which is not a full date-time",
    (value) => {
      expect(() => {
        return parseCkanTimestamp(value);
      }).toThrow("Not a CKAN timestamp");
    },
  );
});

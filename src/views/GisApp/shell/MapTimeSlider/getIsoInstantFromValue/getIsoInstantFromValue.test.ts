/**
 * Query timestamp cells from DuckDB/Arrow into ISO-8601 instants.
 */
import { describe, expect, it } from "vitest";

import { getIsoInstantFromValue } from "./getIsoInstantFromValue";

describe("getIsoInstantFromValue", () => {
  it("converts a Date", () => {
    expect(getIsoInstantFromValue(new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("converts an ISO string", () => {
    expect(getIsoInstantFromValue("2026-01-15T00:00:00.000Z")).toBe(
      "2026-01-15T00:00:00.000Z",
    );
  });

  it("converts epoch milliseconds from Arrow timestamp cells", () => {
    expect(getIsoInstantFromValue(1_767_225_600_000)).toBe(
      "2026-01-01T00:00:00.000Z",
    );
  });

  it("returns undefined for non-timestamps", () => {
    expect(getIsoInstantFromValue(undefined)).toBeUndefined();
    expect(getIsoInstantFromValue("not a date")).toBeUndefined();
  });
});

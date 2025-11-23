import { describe, expect, it } from "vitest";
import { isISODateString } from "./isISODateString";

describe("isISODateString", () => {
  it("recognizes ISO 8601 strings", () => {
    expect(isISODateString("2024-01-21T10:30:00.000Z")).toBe(true);
  });

  it("rejects strings that do not match", () => {
    expect(isISODateString("2024/01/21 10:30:00")).toBe(false);
    expect(isISODateString("2024-01-21")).toBe(false);
  });

  it("rejects non-string inputs", () => {
    expect(isISODateString(1700000000000)).toBe(false);
    expect(isISODateString(null)).toBe(false);
  });
});

import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { isValidDateValue } from "./isValidDateValue.ts";

describe("isValidDateValue", () => {
  it("accepts ISO strings, epoch numbers, and Dayjs instances", () => {
    expect(isValidDateValue("2024-01-21T05:00:00Z")).toBe(true);
    expect(isValidDateValue(1_705_813_200_000)).toBe(true);
    expect(isValidDateValue(dayjs("2024-04-15T00:00:00Z"))).toBe(true);
  });

  it("rejects invalid strings", () => {
    expect(isValidDateValue("not-a-date")).toBe(false);
  });

  it("rejects unsupported types", () => {
    expect(isValidDateValue({})).toBe(false);
    expect(isValidDateValue(null)).toBe(false);
  });
});

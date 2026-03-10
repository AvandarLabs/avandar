import { describe, expect, it } from "vitest";
import { isDate } from "./isDate.ts";

describe("isDate", () => {
  it("returns true for Date instances", () => {
    expect(isDate(new Date())).toBe(true);
    expect(isDate(new Date("2023-01-01"))).toBe(true);
    expect(isDate(new Date(0))).toBe(true);
    expect(isDate(new Date(Date.now()))).toBe(true);
  });

  it("returns false for date strings", () => {
    expect(isDate("2023-01-01")).toBe(false);
    expect(isDate("01/01/2023")).toBe(false);
    expect(isDate("January 1, 2023")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDate(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDate(undefined)).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isDate(0)).toBe(false);
    expect(isDate(1234567890)).toBe(false);
    expect(isDate(Date.now())).toBe(false);
  });

  it("returns false for other types", () => {
    expect(isDate({})).toBe(false);
    expect(isDate([])).toBe(false);
    expect(isDate("string")).toBe(false);
    expect(isDate(true)).toBe(false);
    expect(isDate(() => {})).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { isEmptyObject } from "./isEmptyObject.ts";

describe("isEmptyObject", () => {
  it("returns true for empty object", () => {
    expect(isEmptyObject({})).toBe(true);
  });

  it("returns false for object with properties", () => {
    expect(isEmptyObject({ key: "value" })).toBe(false);
    expect(isEmptyObject({ a: 1, b: 2 })).toBe(false);
    expect(isEmptyObject({ nested: { prop: "value" } })).toBe(false);
  });

  it("returns false for object with falsy values", () => {
    expect(isEmptyObject({ key: false })).toBe(false);
    expect(isEmptyObject({ key: 0 })).toBe(false);
    expect(isEmptyObject({ key: "" })).toBe(false);
    expect(isEmptyObject({ key: null })).toBe(false);
    expect(isEmptyObject({ key: undefined })).toBe(false);
  });

  it("returns false for object with numeric keys", () => {
    expect(isEmptyObject({ 0: "value" })).toBe(false);
    expect(isEmptyObject({ 1: "value", 2: "value" })).toBe(false);
  });
});

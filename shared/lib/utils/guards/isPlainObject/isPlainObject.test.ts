import { describe, expect, it } from "vitest";
import { isPlainObject } from "./isPlainObject.ts";

describe("isPlainObject", () => {
  it("returns true for plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ foo: "bar" })).toBe(true);
    expect(isPlainObject({ a: 1, b: 2 })).toBe(true);
    expect(isPlainObject({ nested: { prop: "value" } })).toBe(true);
  });

  it("returns true for objects created with Object.create(null)", () => {
    const obj = Object.create(null);
    expect(isPlainObject(obj)).toBe(true);
  });

  it("returns true for objects created with Object.create(Object.prototype)", () => {
    const obj = Object.create(Object.prototype);
    expect(isPlainObject(obj)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isPlainObject(undefined)).toBe(false);
  });

  it("returns false for arrays", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject([1, 2, 3])).toBe(false);
  });

  it("returns false for Date instances", () => {
    expect(isPlainObject(new Date())).toBe(false);
  });

  it("returns false for Map instances", () => {
    expect(isPlainObject(new Map())).toBe(false);
  });

  it("returns false for Set instances", () => {
    expect(isPlainObject(new Set())).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject(123)).toBe(false);
    expect(isPlainObject(true)).toBe(false);
    expect(isPlainObject(false)).toBe(false);
  });

  it("returns false for functions", () => {
    expect(isPlainObject(() => {})).toBe(false);
    expect(isPlainObject(function () {})).toBe(false);
  });

  it("returns false for objects with custom prototypes", () => {
    class CustomClass {}
    expect(isPlainObject(new CustomClass())).toBe(false);

    const customProto = { customProp: "value" };
    const obj = Object.create(customProto);
    expect(isPlainObject(obj)).toBe(false);
  });
});

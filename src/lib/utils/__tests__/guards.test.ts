import { describe, expect, it } from "vitest";
import {
  isArray,
  isBoolean,
  isDate,
  isFunction,
  isNotUndefined,
  isNull,
  isNullOrUndefined,
  isNumber,
  isPlainObject,
  isString,
  isUndefined,
} from "../guards";

describe("isPlainObject", () => {
  it("returns true for plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("returns false for non plain objects", () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(() => {})).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
    expect(isPlainObject(123)).toBe(false);
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject(Symbol("s"))).toBe(false);
    expect(isPlainObject(new (class {})())).toBe(false);
  });
});

describe("isArray", () => {
  it("returns true if object is array", () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
  });

  it("returns false if object is not array", () => {
    expect(isArray("[]")).toBe(false);
    expect(isArray({ 0: "a", 1: "b" })).toBe(false);
    expect(isArray(null)).toBe(false);
    expect(isArray(undefined)).toBe(false);
  });
});

describe("isDate", () => {
  it("returns true if value is a Date object", () => {
    expect(isDate(new Date())).toBe(true);
  });

  it("returns false if value is not a Date object", () => {
    expect(isDate(Date.now())).toBe(false); // timestamp
    expect(isDate("2023-01-01")).toBe(false); // ISO string
    expect(isDate({})).toBe(false);
    expect(isDate(null)).toBe(false);
    expect(isDate(undefined)).toBe(false);
  });
});

describe("isNotUndefined", () => {
  it("returns true for defined values", () => {
    expect(isNotUndefined(0)).toBe(true);
    expect(isNotUndefined("")).toBe(true);
    expect(isNotUndefined(null)).toBe(true);
    expect(isNotUndefined(false)).toBe(true);
  });

  it("returns false for undefined", () => {
    expect(isNotUndefined(undefined)).toBe(false);
  });
});

describe("isNullOrUndefined", () => {
  it("returns true for null or undefined", () => {
    expect(isNullOrUndefined(null)).toBe(true);
    expect(isNullOrUndefined(undefined)).toBe(true);
  });

  it("returns false for other values", () => {
    expect(isNullOrUndefined(0)).toBe(false);
    expect(isNullOrUndefined("")).toBe(false);
    expect(isNullOrUndefined(false)).toBe(false);
  });
});

describe("isUndefined", () => {
  it("returns true for undefined", () => {
    expect(isUndefined(undefined)).toBe(true);
  });

  it("returns false for defined values", () => {
    expect(isUndefined(null)).toBe(false);
    expect(isUndefined(0)).toBe(false);
    expect(isUndefined("")).toBe(false);
  });
});

describe("isNull", () => {
  it("returns true for null", () => {
    expect(isNull(null)).toBe(true);
  });

  it("returns false for other values", () => {
    expect(isNull(undefined)).toBe(false);
    expect(isNull(0)).toBe(false);
    expect(isNull("")).toBe(false);
  });
});

describe("isFunction", () => {
  it("returns true for functions", () => {
    expect(isFunction(() => {})).toBe(true);
    expect(isFunction(function () {})).toBe(true);
  });

  it("returns false for non-functions", () => {
    expect(isFunction(123)).toBe(false);
    expect(isFunction(null)).toBe(false);
    expect(isFunction("func")).toBe(false);
  });
});

describe("isNumber", () => {
  it("returns true for numbers", () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(3.14)).toBe(true);
  });

  it("returns false for non-numbers", () => {
    expect(isNumber("123")).toBe(false);
    expect(isNumber(NaN)).toBe(true); // Still a number
    expect(isNumber(undefined)).toBe(false);
  });
});

describe("isString", () => {
  it("returns true for strings", () => {
    expect(isString("hello")).toBe(true);
    expect(isString("")).toBe(true);
  });

  it("returns false for non-strings", () => {
    expect(isString(123)).toBe(false);
    expect(isString(null)).toBe(false);
  });
});

describe("isBoolean", () => {
  it("returns true for booleans", () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
  });

  it("returns false for non-booleans", () => {
    expect(isBoolean("true")).toBe(false);
    expect(isBoolean(0)).toBe(false);
  });
});

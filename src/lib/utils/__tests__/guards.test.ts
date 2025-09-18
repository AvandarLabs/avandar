import { assert, describe, expect, it } from "vitest";
import {
  hasNonUndefinedProps,
  hasPropKeys,
  isArray,
  isBoolean,
  isDate,
  isEmptyObject,
  isFunction,
  isNonEmptyArray,
  isNotUndefined,
  isNull,
  isNullish,
  isNumber,
  isOneOf,
  isPlainObject,
  isPrimitive,
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
    expect(isDate(Date.now())).toBe(false);
    expect(isDate("2023-01-01")).toBe(false);
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
    expect(isNullish(null)).toBe(true);
    expect(isNullish(undefined)).toBe(true);
  });

  it("returns false for other values", () => {
    expect(isNullish(0)).toBe(false);
    expect(isNullish("")).toBe(false);
    expect(isNullish(false)).toBe(false);
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
    expect(isNumber(NaN)).toBe(true);
  });

  it("returns false for non-numbers", () => {
    expect(isNumber("123")).toBe(false);
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

describe("isPrimitive", () => {
  it("returns true if primitive", () => {
    expect(isPrimitive("a")).toBe(true);
    expect(isPrimitive(1)).toBe(true);
    expect(isPrimitive(false)).toBe(true);
    expect(isPrimitive(Symbol())).toBe(true);
    expect(isPrimitive(undefined)).toBe(true);
    expect(isPrimitive(null)).toBe(true);
  });

  it("returns false if not primitive", () => {
    expect(isPrimitive(() => {})).toBe(false);
    expect(isPrimitive([])).toBe(false);
    expect(isPrimitive({})).toBe(false);
    expect(isPrimitive(new Date())).toBe(false);
    expect(isPrimitive(new RegExp(""))).toBe(false);
  });
});

describe("hasPropKeys", () => {
  it("returns true if object has required props", () => {
    const obj: { name: string; email: string } = {
      name: "John Doe",
      email: "johndoe@gmail.com",
    };
    const hasPropKeysCheck = hasPropKeys(obj, ["name", "email"]);
    expect(hasPropKeysCheck).toBe(true);
  });

  it("returns true if property is assigned but value is undefined", () => {
    const obj: { name?: string } = { name: undefined };
    const hasPropKeysCheck = hasPropKeys(obj, ["name"]);
    expect(hasPropKeysCheck).toBe(true);
  });

  it("returns false if object is missing required props", () => {
    // the optional modifier (?) for 'email' satisfies TypeScript
    const obj: { name: string; email?: string } = { name: "John Doe" };
    const hasPropKeysCheck = hasPropKeys(obj, ["name", "email"]);
    expect(hasPropKeysCheck).toBe(false);
  });
});

describe("hasNonUndefinedProps", () => {
  // this typecast satisfies TypeScript for the purpose of this test
  type User = {
    id?: number;
    name?: string;
    email?: string | undefined | null;
  };

  it("returns true when all props exist and are not undefined", () => {
    const user: User = { id: 1, name: "Alice", email: "alice@example.com" };
    expect(hasNonUndefinedProps(user, ["id", "name", "email"])).toBe(true);
  });

  it("returns false if any prop is undefined", () => {
    const user: User = { id: 1, name: "Alice", email: undefined };
    expect(hasNonUndefinedProps(user, ["id", "name", "email"])).toBe(false);
  });

  it("returns true if props exist and are null", () => {
    const user: User = { id: 1, name: "Alice", email: null };
    expect(hasNonUndefinedProps(user, ["id", "name", "email"])).toBe(true);
  });

  it("returns false if a prop is missing", () => {
    const user: Partial<User> = { id: 1 };
    expect(hasNonUndefinedProps(user, ["id", "name"])).toBe(false);
  });
});

describe("assert", () => {
  it("should throw error if the condition is falsey", () => {
    [undefined, false, "", null, 0].map((value) => {
      expect(() => {
        assert(value);
      }).toThrowError();
    });
  });

  it("should not throw error if the condition is truthy", () => {
    [{}, true, "abc", 42].map((value) => {
      expect(() => {
        assert(value);
      }).not.toThrowError();
    });
  });

  it("throws with custom message", () => {
    expect(() => {
      assert(false, "Custom error");
    }).toThrow("Custom error");
  });
});

describe("isEmptyObject", () => {
  it("returns true for an empty object", () => {
    expect(isEmptyObject({})).toBe(true);
  });

  it("returns false for an object with keys", () => {
    expect(isEmptyObject({ a: 1 })).toBe(false);
    expect(isEmptyObject({ b: undefined })).toBe(false);
  });
});

describe("isOneOf", () => {
  it("returns true if value is in the array", () => {
    expect(isOneOf("a", ["a", "b", "c"])).toBe(true);
    expect(isOneOf(2, [1, 2, 3])).toBe(true);
    expect(isOneOf(true, [true, false])).toBe(true);
  });

  it("returns false if value is not in the array", () => {
    expect(isOneOf("z", ["a", "b", "c"])).toBe(false);
    expect(isOneOf(4, [1, 2, 3])).toBe(false);
    expect(isOneOf(false, [true])).toBe(false);
  });

  it("returns false if value is of a different type", () => {
    expect(isOneOf("1", [1, 2, 3])).toBe(false);
    expect(isOneOf(1, ["1", "2", "3"])).toBe(false);
  });
});

describe("isNonEmptyArray", () => {
  it("returns true for non-empty arrays", () => {
    expect(isNonEmptyArray([1])).toBe(true);
    expect(isNonEmptyArray(["a", "b"])).toBe(true);
  });

  it("returns false for empty arrays", () => {
    expect(isNonEmptyArray([])).toBe(false);
  });
});

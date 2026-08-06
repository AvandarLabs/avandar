import { objectFilter } from "@utils/objects/objectFilter/objectFilter.ts";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("objectFilter", () => {
  describe("boolean filterFn", () => {
    it("removes keys where the filter returns false", () => {
      const input = { a: 1, b: 2, c: 3 };

      const result = objectFilter(input, (_key, value) => {
        return value % 2 === 1;
      });

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("keeps all keys when every value passes", () => {
      const input = { a: 1, b: 2 };

      const result = objectFilter(input, () => {
        return true;
      });

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it("returns an empty object when no values pass", () => {
      const input = { a: 1, b: 2 };

      const result = objectFilter(input, () => {
        return false;
      });

      expect(result).toEqual({});
    });

    it("handles an empty object", () => {
      const result = objectFilter({}, () => {
        return true;
      });

      expect(result).toEqual({});
    });

    it("passes each key and value to the filter function", () => {
      const input = { a: 1, b: 2 };
      const seen: Array<{ key: string; value: number }> = [];

      objectFilter(input, (key, value) => {
        seen.push({ key: String(key), value });
        return key === "b";
      });

      expect(seen).toEqual([
        { key: "a", value: 1 },
        { key: "b", value: 2 },
      ]);
    });

    it("does not copy inherited properties", () => {
      const parent = { inherited: 1 };
      const input = Object.create(parent) as { own: number };
      input.own = 2;

      const result = objectFilter(input, () => {
        return true;
      });

      expect(result).toEqual({ own: 2 });
      expect(Object.hasOwn(result, "inherited")).toBe(false);
    });

    it("returns a new object and does not mutate the input", () => {
      const input = { a: 1, b: 2, c: 3 };
      const copy = { ...input };

      const result = objectFilter(input, (_key, value) => {
        return value !== 2;
      });

      expect(result).not.toBe(input);
      expect(input).toEqual(copy);
    });

    it("preserves values of different types", () => {
      const input = {
        str: "hello",
        num: 42,
        bool: true,
        nul: null,
        undef: undefined,
        arr: [1, 2],
        obj: { nested: true },
      };

      const result = objectFilter(input, (_key, value) => {
        return value !== null && value !== undefined;
      });

      expect(result).toEqual({
        str: "hello",
        num: 42,
        bool: true,
        arr: [1, 2],
        obj: { nested: true },
      });
    });
  });
});

describe("objectFilter types", () => {
  it("returns the same object type for a boolean filter", () => {
    const input = { a: 1, b: "two" };

    const result = objectFilter(input, () => {
      return true;
    });

    expectTypeOf(result).toEqualTypeOf(input);
  });

  it("applies type narrowing to the values of a shaped object", () => {
    const input = { a: "one", b: 2, c: "three" };

    const result = objectFilter(input, (_key, value): value is string => {
      return typeof value === "string";
    });

    expectTypeOf(result).toEqualTypeOf<{ a: string; c: string }>();
  });

  it("applies type narrowing to the values of a record", () => {
    const input: Record<string, string | number> = {
      a: "one",
      b: 2,
    };

    const result = objectFilter(input, (_key, value): value is string => {
      return typeof value === "string";
    });

    expectTypeOf(result).toEqualTypeOf<Record<string, string>>();
  });
});

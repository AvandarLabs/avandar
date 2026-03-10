import { describe, expect, it } from "vitest";
import { isNull } from "../../guards/isNull/isNull.ts";
import { swapDeep } from "./swapDeep.ts";

describe("swapDeep", () => {
  describe("primitives and non-object values", () => {
    it("swaps a primitive that matches the guard", () => {
      const result = swapDeep(null, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return "replaced";
        },
      });

      expect(result).toBe("replaced");
    });

    it("returns a primitive as-is when it does not match", () => {
      const result = swapDeep("hello", {
        isTypeToSwap: isNull,
        swapWith: () => {
          return "replaced";
        },
      });

      expect(result).toBe("hello");
    });
  });

  describe("plain objects", () => {
    it("swaps top-level values matching the guard", () => {
      const input = { a: 1, b: null, c: "hi" };

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return undefined;
        },
      });

      expect(result).toEqual({
        a: 1,
        b: undefined,
        c: "hi",
      });
    });

    it("swaps nested values matching the guard", () => {
      const input = {
        a: 1,
        nested: { b: null, c: "keep" },
      };

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });

      expect(result).toEqual({
        a: 1,
        nested: { b: 0, c: "keep" },
      });
    });

    it("passes the matched value to swapWith", () => {
      const input = { a: 1, b: 2, c: 3 };

      const result = swapDeep(input, {
        isTypeToSwap: (v): v is number => {
          return typeof v === "number";
        },
        swapWith: (v) => {
          return v * 10;
        },
      });

      expect(result).toEqual({ a: 10, b: 20, c: 30 });
    });

    it("returns a new object and does not mutate the input", () => {
      const input = { a: null, b: "keep" };
      const copy = { ...input };

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return "swapped";
        },
      });

      expect(result).not.toBe(input);
      expect(input).toEqual(copy);
    });
  });

  describe("arrays", () => {
    it("swaps array elements matching the guard", () => {
      const input = [1, null, 2, null, 3];

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });

      expect(result).toEqual([1, 0, 2, 0, 3]);
    });

    it("recurses into objects inside arrays", () => {
      const input = [
        { a: 1, b: null },
        { c: null, d: "keep" },
      ];

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return "filled";
        },
      });

      expect(result).toEqual([
        { a: 1, b: "filled" },
        { c: "filled", d: "keep" },
      ]);
    });
  });

  describe("Maps", () => {
    it("swaps Map values matching the guard", () => {
      const input = new Map<string, unknown>([
        ["a", 1],
        ["b", null],
        ["c", "hi"],
      ]);

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return "swapped";
        },
      });

      expect(result).toBeInstanceOf(Map);
      expect(result).toEqual(
        new Map<string, unknown>([
          ["a", 1],
          ["b", "swapped"],
          ["c", "hi"],
        ]),
      );
    });

    it("recurses into Map values that are objects", () => {
      const inner = { x: null, y: "keep" };
      const input = new Map<string, unknown>([["entry", inner]]);

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });
      const resultMap = result as Map<string, unknown>;

      expect(resultMap.get("entry")).toEqual({
        x: 0,
        y: "keep",
      });
    });

    it("returns a new Map instance", () => {
      const input = new Map([["a", 1]]);

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });

      expect(result).not.toBe(input);
    });
  });

  describe("Sets", () => {
    it("swaps Set values matching the guard", () => {
      const input = new Set([1, null, 2]);

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });

      expect(result).toBeInstanceOf(Set);
      expect(result).toEqual(new Set([1, 0, 2]));
    });

    it("returns a new Set instance", () => {
      const input = new Set([1, 2]);

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });

      expect(result).not.toBe(input);
    });
  });

  describe("class instances", () => {
    it("returns class instances as-is", () => {
      class MyClass {
        value: null = null;
      }
      const instance = new MyClass();

      const result = swapDeep(instance, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });

      expect(result).toBe(instance);
    });

    it("returns Date objects as-is", () => {
      const date = new Date("2025-01-01");

      const result = swapDeep(date, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return 0;
        },
      });

      expect(result).toBe(date);
    });
  });

  describe("mixed structures", () => {
    it("handles a complex nested structure", () => {
      const input = {
        name: "root",
        empty: null,
        children: [
          {
            name: "child1",
            tag: null,
            meta: { color: "red", size: null },
          },
          null,
          {
            name: "child2",
            data: new Map<string, unknown>([
              ["key1", "val"],
              ["key2", null],
            ]),
          },
        ],
      };

      const result = swapDeep(input, {
        isTypeToSwap: isNull,
        swapWith: () => {
          return "<empty>";
        },
      });

      expect(result).toEqual({
        name: "root",
        empty: "<empty>",
        children: [
          {
            name: "child1",
            tag: "<empty>",
            meta: { color: "red", size: "<empty>" },
          },
          "<empty>",
          {
            name: "child2",
            data: new Map<string, unknown>([
              ["key1", "val"],
              ["key2", "<empty>"],
            ]),
          },
        ],
      });
    });
  });
});

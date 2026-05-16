import { makeSet } from "@utils/sets/makeSet/makeSet.ts";
import { describe, expect, it } from "vitest";

describe("makeSet", () => {
  describe("without key or hashFn", () => {
    it("builds a set from primitive values", () => {
      const result = makeSet([1, 2, 2, 3], {});

      expect(
        [...result].sort((a, b) => {
          return a - b;
        }),
      ).toEqual([1, 2, 3]);
    });

    it("returns an empty set for an empty list", () => {
      const result = makeSet([], {});

      expect(result.size).toBe(0);
    });
  });

  describe("with key", () => {
    it("collects values for the given property", () => {
      const rows = [
        { id: "a", n: 1 },
        { id: "b", n: 2 },
        { id: "a", n: 3 },
      ];

      const result = makeSet(rows, { key: "id" });

      expect([...result].sort()).toEqual(["a", "b"]);
    });
  });

  describe("with hashFn", () => {
    it("maps each item through hashFn", () => {
      const rows = [{ v: 1 }, { v: 2 }, { v: 1 }];

      const result = makeSet(rows, {
        hashFn: (row) => {
          return row.v * 10;
        },
      });

      expect(
        [...result].sort((a, b) => {
          return a - b;
        }),
      ).toEqual([10, 20]);
    });
  });

  describe("key and hashFn together", () => {
    it("prefers key over hashFn", () => {
      const rows = [{ id: "x", label: "one" }];

      const result = makeSet(rows, {
        key: "id",
        hashFn: () => {
          return "ignored";
        },
      });

      expect([...result]).toEqual(["x"]);
    });
  });
});

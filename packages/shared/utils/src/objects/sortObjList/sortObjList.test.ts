import { describe, expect, it } from "vitest";
import { mixedComparator, sortObjList } from "./sortObjList.ts";

describe("mixedComparator", () => {
  it("returns zero when both values are nullish", () => {
    expect(mixedComparator(null, undefined, {})).toBe(0);
    expect(mixedComparator(null, null, {})).toBe(0);
    expect(mixedComparator(undefined, undefined, {})).toBe(0);
  });

  it("sorts nullish values last when nullOrUndefinedSortOrder is last", () => {
    expect(mixedComparator(null, "a", {})).toBeGreaterThan(0);
    expect(mixedComparator("a", null, {})).toBeLessThan(0);
    expect(mixedComparator(undefined, 1, {})).toBeGreaterThan(0);
    expect(mixedComparator(1, undefined, {})).toBeLessThan(0);
  });

  it("sorts nullish values first when nullOrUndefinedSortOrder is first", () => {
    const opts = { nullOrUndefinedSortOrder: "first" as const };

    expect(mixedComparator(null, "a", opts)).toBeLessThan(0);
    expect(mixedComparator("a", null, opts)).toBeGreaterThan(0);
  });

  it("compares two strings lexicographically", () => {
    expect(mixedComparator("apple", "banana", {})).toBeLessThan(0);
    expect(mixedComparator("zebra", "apple", {})).toBeGreaterThan(0);
    expect(mixedComparator("same", "same", {})).toBe(0);
  });

  it("compares two numbers numerically", () => {
    expect(mixedComparator(1, 2, {})).toBeLessThan(0);
    expect(mixedComparator(3, 1, {})).toBeGreaterThan(0);
    expect(mixedComparator(0, 0, {})).toBe(0);
  });

  it("compares a string with a number using string rules", () => {
    expect(mixedComparator("5", 10, {})).toBe("5".localeCompare(String(10)));
    expect(mixedComparator(5, "10", {})).toBe("10".localeCompare(String(5)));
  });
});

describe("sortObjList", () => {
  it("sorts objects by an extracted string field", () => {
    const rows = [
      { id: 1, name: "gamma" },
      { id: 2, name: "alpha" },
      { id: 3, name: "beta" },
    ] as const;
    const result = sortObjList(rows, {
      sortBy: (row) => {
        return row.name;
      },
    });
    expect(
      result.map((row) => {
        return row.id;
      }),
    ).toEqual([2, 3, 1]);
  });

  it("sorts objects by an extracted number field", () => {
    const rows = [
      { id: "a", score: 30 },
      { id: "b", score: 10 },
      { id: "c", score: 20 },
    ] as const;

    const result = sortObjList(rows, {
      sortBy: (row) => {
        return row.score;
      },
    });
    expect(
      result.map((row) => {
        return row.id;
      }),
    ).toEqual(["b", "c", "a"]);
  });
  it("returns an empty array when given an empty list", () => {
    expect(
      sortObjList([] as ReadonlyArray<{ id: number }>, {
        sortBy: (row) => {
          return row.id;
        },
      }),
    ).toEqual([]);
  });

  it("does not mutate the input list", () => {
    const rows = [
      { id: 1, name: "b" },
      { id: 2, name: "a" },
    ];
    sortObjList(rows, {
      sortBy: (row) => {
        return row.name;
      },
    });
    expect(rows[0]?.name).toBe("b");
    expect(rows[1]?.name).toBe("a");
  });

  it("uses a custom comparator when provided", () => {
    const rows = [
      { id: 1, name: "a" },
      { id: 2, name: "b" },
    ] as const;

    const result = sortObjList(rows, {
      sortBy: (row) => {
        return row.name;
      },
      comparator: (a, b) => {
        return b.localeCompare(a);
      },
    });

    expect(
      result.map((row) => {
        return row.id;
      }),
    ).toEqual([2, 1]);
  });

  it("places nullish sort keys last when sortNullishValues is last", () => {
    const rows = [
      { id: 1, key: "b" as string | null },
      { id: 2, key: null as string | null },
      { id: 3, key: "a" as string | null },
    ];

    const result = sortObjList(rows, {
      sortBy: (obj) => {
        return obj.key as string;
      },
      sortNullishValues: "last",
    });

    expect(
      result.map((row) => {
        return row.id;
      }),
    ).toEqual([3, 1, 2]);
  });

  it("places nullish sort keys first when sortNullishValues is first", () => {
    const rows = [
      { id: 1, key: "b" as string | null },
      { id: 2, key: null as string | null },
      { id: 3, key: "a" as string | null },
    ];
    const result = sortObjList(rows, {
      sortBy: (obj) => {
        return obj.key as string;
      },
      sortNullishValues: "first",
    });
    expect(
      result.map((row) => {
        return row.id;
      }),
    ).toEqual([2, 3, 1]);
  });
});

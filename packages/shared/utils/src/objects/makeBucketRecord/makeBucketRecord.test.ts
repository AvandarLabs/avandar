import { describe, expect, it, vi } from "vitest";
import { makeBucketRecord } from "./makeBucketRecord.ts";
import type { Expect, IsEqual } from "../../types/test-utilities.types.ts";

describe("makeBucketRecord", () => {
  it("groups values by a provided key and appends colliding entries", () => {
    const data = [
      { category: "fruit", value: "apple" },
      { category: "fruit", value: "banana" },
      { category: "vegetable", value: "kale" },
    ];

    const result = makeBucketRecord(data, {
      key: "category",
      valueKey: "value",
    });

    expect(result).toEqual({
      fruit: ["apple", "banana"],
      vegetable: ["kale"],
    });
  });

  it("prefers structural keys over functions when both are provided", () => {
    const data = [{ bucket: "north", value: 3, fallback: "unused" }];
    const keyFn = vi.fn(() => {
      throw new Error("keyFn should not run when key is provided");
    });
    const valueFn = vi.fn(() => {
      throw new Error("valueFn should not run when valueKey is provided");
    });

    const result = makeBucketRecord(data, {
      key: "bucket",
      keyFn,
      valueKey: "value",
      valueFn,
    });

    expect(result).toEqual({ north: [3] });
    expect(keyFn).not.toHaveBeenCalled();
    expect(valueFn).not.toHaveBeenCalled();
  });

  it("uses keyFn and valueFn when structural keys are omitted", () => {
    const data = [
      { score: 92, name: "Alice" },
      { score: 67, name: "Bob" },
      { score: 61, name: "Cara" },
    ];

    const result = makeBucketRecord(data, {
      keyFn: (item) => {
        return item.score >= 80 ? "pass" : "review";
      },
      valueFn: (item) => {
        return `${item.name}:${item.score}`;
      },
    });

    expect(result).toEqual({
      pass: ["Alice:92"],
      review: ["Bob:67", "Cara:61"],
    });
  });
});

// ============================================================================
// Type tests
// ============================================================================

const makeBucketRecordTypeInput = [
  { id: 1, team: "north", label: "Ada", active: true },
  { id: 2, team: "south", label: "Bob", active: false },
] as const;

const bucketRecordFromStringKeys = makeBucketRecord(makeBucketRecordTypeInput, {
  key: "team",
  valueKey: "label",
});

const bucketRecordFromFns = makeBucketRecord(makeBucketRecordTypeInput, {
  keyFn: (item) => {
    return item.active ? "active" : "inactive";
  },
  valueFn: (item) => {
    return item.id;
  },
});

// @ts-expect-error allow unused variable declaration.
type TypeTests = [
  Expect<
    IsEqual<
      typeof bucketRecordFromStringKeys,
      Record<"north" | "south", Array<"Ada" | "Bob">>
    >
  >,
  Expect<
    IsEqual<
      typeof bucketRecordFromFns,
      Record<"active" | "inactive", Array<1 | 2>>
    >
  >,
];

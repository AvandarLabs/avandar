import { describe, expect, it, vi } from "vitest";
import type { Expect, IsEqual } from "../../types/testUtilityTypes.ts";
import { makeObject } from "./makeObject.ts";

describe("makeObject", () => {
  it("uses structural keys over functions and keeps the last duplicate entry", () => {
    const data = [
      { id: "alpha", label: "first", fallbackId: "ignored-1" },
      { id: "alpha", label: "second", fallbackId: "ignored-2" },
    ];
    const keyFn = vi.fn((item: (typeof data)[number]) => {
      return item.fallbackId;
    });
    const valueFn = vi.fn(() => {
      throw new Error("valueFn should not run when valueKey is provided");
    });

    const result = makeObject(data, {
      key: "id",
      keyFn,
      valueKey: "label",
      valueFn,
    });

    expect(result).toEqual({ alpha: "second" });
    expect(keyFn).not.toHaveBeenCalled();
    expect(valueFn).not.toHaveBeenCalled();
  });

  it("uses the provided default value and skips nullish keys", () => {
    const data = [
      { key: "present" },
      { key: null as unknown as string },
      { key: undefined as unknown as string },
    ];

    const result = makeObject(data, {
      key: "key",
      defaultValue: { selected: true },
    });

    expect(result).toEqual({
      present: { selected: true },
    });
  });

  it("falls back to keyFn and valueFn when structural keys are omitted", () => {
    const data = [
      { firstName: "Ada", lastName: "Lovelace", role: "analyst" },
      { firstName: "Grace", lastName: "Hopper", role: "admiral" },
    ];

    const result = makeObject(data, {
      keyFn: (item) => {
        return item.lastName.toLowerCase();
      },
      valueFn: (item) => {
        return `${item.firstName} (${item.role})`;
      },
    });

    expect(result).toEqual({
      lovelace: "Ada (analyst)",
      hopper: "Grace (admiral)",
    });
  });
});

// ============================================================================
// Type tests
// ============================================================================

const makeObjectTypeInput = [
  { id: "alpha", label: "Alpha", bucket: "group-a", score: 1 },
  { id: "beta", label: "Beta", bucket: "group-b", score: 2 },
] as const;

const objectFromStringKeys = makeObject(makeObjectTypeInput, {
  key: "id",
  valueKey: "label",
});

const objectFromFns = makeObject(makeObjectTypeInput, {
  keyFn: (item) => {
    return item.bucket;
  },
  valueFn: (item) => {
    return item.score;
  },
});

// @ts-expect-error allow unused variable declaration.
type TypeTests = [
  Expect<
    IsEqual<
      typeof objectFromStringKeys,
      Record<"alpha" | "beta", "Alpha" | "Beta">
    >
  >,
  Expect<
    IsEqual<typeof objectFromFns, Record<"group-a" | "group-b", 1 | 2>>
  >,
];

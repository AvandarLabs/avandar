import { describe, expect, it } from "vitest";
import { makeObjectFromEntries } from "@utils/objects/makeObjectFromEntries/makeObjectFromEntries.ts";
import type { Expect, IsEqual } from "@utils/types/test-utilities.types.ts";

describe("makeObjectFromEntries", () => {
  it("keeps the last value for duplicate keys across string and numeric entries", () => {
    const entries: ReadonlyArray<[string | number, string]> = [
      [1, "first"],
      ["status", "draft"],
      [1, "second"],
      ["status", "published"],
    ];

    const result = makeObjectFromEntries(entries);

    expect(result[1]).toBe("second");
    expect(result.status).toBe("published");
    expect(Object.keys(result)).toEqual(["1", "status"]);
  });
});

// ============================================================================
// Type tests
// ============================================================================

const stringEntries = [
  ["draft", 0 as const],
  ["published", 1 as const],
] satisfies ReadonlyArray<["draft" | "published", 0 | 1]>;

const numberEntries = [
  [1, "one" as const],
  [2, "two" as const],
] satisfies ReadonlyArray<[1 | 2, "one" | "two"]>;

const objectFromStringEntries = makeObjectFromEntries(stringEntries);
const objectFromNumberEntries = makeObjectFromEntries(numberEntries);

// @ts-expect-error allow unused variable declaration.
type TypeTests = [
  Expect<
    IsEqual<
      typeof objectFromStringEntries,
      Record<"draft" | "published", 0 | 1>
    >
  >,
  Expect<IsEqual<typeof objectFromNumberEntries, Record<1 | 2, "one" | "two">>>,
];

import { describe, expect, it } from "vitest";
import type { Expect, IsEqual } from "../../types/testUtilityTypes.ts";
import { makeIdLookupRecord } from "./makeIdLookupRecord.ts";

describe("makeIdLookupRecord", () => {
  it("indexes records by the default id key and keeps the last duplicate entry", () => {
    const data = [
      { id: "dup", name: "first" },
      { id: "dup", name: "second" },
      { id: "unique", name: "third" },
    ];

    const result = makeIdLookupRecord(data);

    expect(result).toEqual({
      dup: { id: "dup", name: "second" },
      unique: { id: "unique", name: "third" },
    });
  });

  it("supports a custom shallow key and skips nullish ids", () => {
    const data = [
      { uuid: "u1", name: "Alpha" },
      { uuid: null as unknown as string, name: "Missing" },
      { uuid: "u2", name: "Beta" },
    ];

    const result = makeIdLookupRecord(data, { key: "uuid" });

    expect(result).toEqual({
      u1: { uuid: "u1", name: "Alpha" },
      u2: { uuid: "u2", name: "Beta" },
    });
  });
});

// ============================================================================
// Type tests
// ============================================================================

const makeIdLookupRecordTypeInput = [
  { id: "user-1", slug: "alpha", name: "Ada" },
  { id: "user-2", slug: "beta", name: "Bob" },
] as const;

const idLookupByDefaultKey = makeIdLookupRecord(makeIdLookupRecordTypeInput);
const idLookupByCustomStringKey = makeIdLookupRecord(
  makeIdLookupRecordTypeInput,
  {
    key: "slug",
  },
);

type LookupItem = (typeof makeIdLookupRecordTypeInput)[number];

// @ts-expect-error allow unused variable declaration.
type TypeTests = [
  Expect<
    IsEqual<typeof idLookupByDefaultKey, Record<"user-1" | "user-2", LookupItem>>
  >,
  Expect<
    IsEqual<typeof idLookupByCustomStringKey, Record<"alpha" | "beta", LookupItem>>
  >,
];

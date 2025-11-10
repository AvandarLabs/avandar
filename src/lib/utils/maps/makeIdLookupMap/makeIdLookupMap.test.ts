import { describe, expect, it } from "vitest";

import { makeIdLookupMap } from "./makeIdLookupMap";

describe("makeIdLookupMap", () => {
  it("indexes records by the default id key", () => {
    const data = [
      { id: 1, name: "Alpha" },
      { id: 2, name: "Beta" },
    ];

    const result = makeIdLookupMap(data);

    expect(result.get(1)).toEqual({ id: 1, name: "Alpha" });
    expect(result.get(2)).toEqual({ id: 2, name: "Beta" });
  });

  it("supports a custom shallow key", () => {
    const data = [
      { uuid: "u1", name: "Alpha" },
      { uuid: "u2", name: "Beta" },
    ];

    const result = makeIdLookupMap(data, { key: "uuid" });

    expect(result.get("u1")).toEqual({ uuid: "u1", name: "Alpha" });
  });

  it("accepts dot-notation paths for deep identifiers", () => {
    const data = [
      { meta: { identifiers: { slug: "alpha" } }, payload: 10 },
      { meta: { identifiers: { slug: "beta" } }, payload: 20 },
    ];

    const result = makeIdLookupMap(data, { key: "meta.identifiers.slug" });

    expect(result.get("alpha")?.payload).toBe(10);
    expect(result.get("beta")?.payload).toBe(20);
  });

  it("keeps the last seen entry for duplicate identifiers", () => {
    const data = [
      { id: "dup", name: "first" },
      { id: "dup", name: "second" },
    ];

    const result = makeIdLookupMap(data);

    expect(result.get("dup")).toEqual({ id: "dup", name: "second" });
  });
});

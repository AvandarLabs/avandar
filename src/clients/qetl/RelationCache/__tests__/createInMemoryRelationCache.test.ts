/**
 * Pins in-memory cache superset reuse: subset hits, wider misses with
 * growFrom.
 */

import { describe, expect, it } from "vitest";
import { createInMemoryRelationCache } from "@/clients/qetl/RelationCache/__tests__/createInMemoryRelationCache";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { RelationCacheKey } from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type { RelationCacheWrite } from "$/models/relations/RelationCachePort/RelationCachePort.types";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const PRINCIPAL_KEY = "w:11111111-1111-4111-8111-111111111111:user";

function _makeWrite(
  overrides: {
    columns?: readonly string[] | "all";
  } = {},
): RelationCacheWrite {
  return {
    payload: new Blob(["parquet-bytes"]),
    columns: overrides.columns ?? ["a", "b"],
    identity: {
      principal: PRINCIPAL_KEY,
      relation: { kind: "dataset", id: DATASET_ID },
      definition: undefined,
      sourceVersion: undefined,
    },
  };
}

function _makeKey(overrides: Partial<RelationCacheKey> = {}): RelationCacheKey {
  return {
    principal: PRINCIPAL_KEY,
    relation: { kind: "dataset", id: DATASET_ID },
    definition: undefined,
    sourceVersion: undefined,
    columns: ["a"],
    ...overrides,
  };
}

describe("createInMemoryRelationCache column coverage", () => {
  it("serves a subset of a cached finite set", async () => {
    const cache = createInMemoryRelationCache();
    await cache.write(_makeWrite({ columns: ["a", "b"] }));
    const { hits, misses } = await cache.probe([_makeKey({ columns: ["a"] })]);
    expect(hits).toHaveLength(1);
    expect(misses).toHaveLength(0);
  });

  it("misses a wider request and offers growFrom", async () => {
    const cache = createInMemoryRelationCache();
    await cache.write(_makeWrite({ columns: ["a"] }));
    const { hits, misses } = await cache.probe([
      _makeKey({ columns: ["a", "b"] }),
    ]);
    expect(hits).toHaveLength(0);
    expect(misses[0]?.growFrom?.columns).toEqual(["a"]);
  });

  it("serves any request from a cached 'all' entry", async () => {
    const cache = createInMemoryRelationCache();
    await cache.write(_makeWrite({ columns: "all" }));
    const { hits } = await cache.probe([_makeKey({ columns: ["a"] })]);
    expect(hits).toHaveLength(1);
  });
});

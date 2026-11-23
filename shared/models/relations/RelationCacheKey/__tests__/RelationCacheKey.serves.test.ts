import { describe, expect, it } from "vitest";
import { serves } from "$/models/relations/RelationCacheKey/RelationCacheKey.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";

const DATASET_ID = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as Dataset.Id;

/** A fixed "current time" for the reuse predicate's staleness check. */
const NOW = 1_800_000_000_000;

describe("serves", () => {
  it("serves when principal, table, definition match and columns are covered", () => {
    const entry = {
      principalKey: "w:ws:u",
      tableName: DATASET_ID,
      definitionToken: "d0",
      columns: ["a", "b"],
      staleAt: undefined,
    };
    expect(
      serves({
        entry,
        key: {
          principalKey: "w:ws:u",
          tableName: DATASET_ID,
          definitionToken: "d0",
          columns: ["a"],
        },
        now: NOW,
      }),
    ).toBe(true);
  });

  it("never serves a different principal, even over the same relation and definition", () => {
    const entry = {
      principalKey: "w:ws:u",
      tableName: DATASET_ID,
      definitionToken: "d0",
      columns: "all" as const,
      staleAt: undefined,
    };
    expect(
      serves({
        entry,
        key: {
          principalKey: "p:published:dash1:1",
          tableName: DATASET_ID,
          definitionToken: "d0",
          columns: "all",
        },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("does not serve once its stale-at time has passed", () => {
    const entry = {
      principalKey: "w:ws:u",
      tableName: DATASET_ID,
      definitionToken: "d0",
      columns: "all" as const,
      staleAt: NOW - 1,
    };
    expect(
      serves({
        entry,
        key: {
          principalKey: "w:ws:u",
          tableName: DATASET_ID,
          definitionToken: "d0",
          columns: "all",
        },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("does not serve at exactly its stale-at time", () => {
    const entry = {
      principalKey: "w:ws:u",
      tableName: DATASET_ID,
      definitionToken: "d0",
      columns: "all" as const,
      staleAt: NOW,
    };
    expect(
      serves({
        entry,
        key: {
          principalKey: "w:ws:u",
          tableName: DATASET_ID,
          definitionToken: "d0",
          columns: "all",
        },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("serves until its stale-at time arrives", () => {
    const entry = {
      principalKey: "w:ws:u",
      tableName: DATASET_ID,
      definitionToken: "d0",
      columns: "all" as const,
      staleAt: NOW + 1,
    };
    expect(
      serves({
        entry,
        key: {
          principalKey: "w:ws:u",
          tableName: DATASET_ID,
          definitionToken: "d0",
          columns: "all",
        },
        now: NOW,
      }),
    ).toBe(true);
  });

  it("does not serve a different definition token", () => {
    const entry = {
      principalKey: "w:ws:u",
      tableName: DATASET_ID,
      definitionToken: "d1.aaaa",
      columns: "all" as const,
      staleAt: undefined,
    };
    expect(
      serves({
        entry,
        key: {
          principalKey: "w:ws:u",
          tableName: DATASET_ID,
          definitionToken: "d1.bbbb",
          columns: "all",
        },
        now: NOW,
      }),
    ).toBe(false);
  });
});

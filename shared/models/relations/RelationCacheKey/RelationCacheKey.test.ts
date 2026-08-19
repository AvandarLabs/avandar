import {
  coversColumns,
  makeIdentityTokensFromIdentity,
  makePreparedRelationCacheKeyFromKey,
  makePrincipalKeyFromPublicSession,
  makePrincipalKeyFromWorkspaceSession,
  normalizeColumns,
  serves,
  unionColumnSets,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.ts";
import { describe, expect, it } from "vitest";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { RelationCacheIdentity } from "$/models/relations/RelationCacheKey/RelationCacheKey.types.ts";

const DATASET_ID = "0f2c9f3e-1111-4222-8333-a1b2c3d4e5f6" as Dataset.Id;
const OTHER_DATASET_ID = "0f2c9f3e-2222-4222-8333-a1b2c3d4e5f6" as Dataset.Id;

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_WORKSPACE_ID = "22222222-2222-4222-8222-222222222222";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const DASHBOARD_ID = "44444444-4444-4444-8444-444444444444";

const WORKSPACE_PRINCIPAL = makePrincipalKeyFromWorkspaceSession({
  workspaceId: WORKSPACE_ID,
  userId: USER_ID,
});

function _makeIdentity(
  overrides: Partial<RelationCacheIdentity> = {},
): RelationCacheIdentity {
  return {
    principal: WORKSPACE_PRINCIPAL,
    relation: { kind: "dataset", id: DATASET_ID },
    definition: { kind: "virtual-sql", text: "select * from t" },
    sourceVersion: undefined,
    ...overrides,
  };
}

describe("makePrincipalKeyFromWorkspaceSession", () => {
  it("builds the workspace principal form", () => {
    expect(
      makePrincipalKeyFromWorkspaceSession({
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
      }),
    ).toBe(`w:${WORKSPACE_ID}:${USER_ID}`);
  });

  it("rejects a userId that could carry the ':' delimiter", () => {
    expect(() => {
      return makePrincipalKeyFromWorkspaceSession({
        workspaceId: WORKSPACE_ID,
        userId: "b:c",
      });
    }).toThrow();
  });

  it("rejects a workspaceId that could carry the ':' delimiter", () => {
    expect(() => {
      return makePrincipalKeyFromWorkspaceSession({
        workspaceId: "a:b",
        userId: USER_ID,
      });
    }).toThrow();
  });

  it("never lets two different (workspaceId, userId) pairs collide on one principal key", () => {
    // Both embed raw with no delimiter check, `{ workspaceId: "a", userId:
    // "b:c" }` and `{ workspaceId: "a:b", userId: "c" }` would otherwise both
    // serialize to "w:a:b:c": two different principals sharing one cache
    // key, which is the exact false hit this cache exists to prevent. The
    // UUID assertion rejects both non-UUID pairs outright, so the collision
    // can never be constructed.
    expect(() => {
      return makePrincipalKeyFromWorkspaceSession({
        workspaceId: "a",
        userId: "b:c",
      });
    }).toThrow();
    expect(() => {
      return makePrincipalKeyFromWorkspaceSession({
        workspaceId: "a:b",
        userId: "c",
      });
    }).toThrow();
  });
});

describe("makePrincipalKeyFromPublicSession", () => {
  it("builds the public principal form", () => {
    expect(
      makePrincipalKeyFromPublicSession({
        bucket: "published",
        dashboardId: DASHBOARD_ID,
        snapshotRevision: "rev.1_2-A",
      }),
    ).toBe(`p:published:${DASHBOARD_ID}:rev.1_2-A`);
  });

  it("encodes a snapshotRevision that carries the ':' delimiter", () => {
    // Revisions are ISO-8601 timestamps in this system, so every real one
    // contains colons. Rejecting them, which this used to do, made the public
    // principal impossible to build. Encoding keeps the delimiter safe instead.
    const key = makePrincipalKeyFromPublicSession({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "2026-08-14T00:00:00.000Z",
    });

    expect(key).toBe(
      `p:published:${DASHBOARD_ID}:2026-08-14T00%3A00%3A00.000Z`,
    );
    expect(key.split(":")).toHaveLength(4);
  });

  it("keeps two revisions that differ only around the delimiter distinct", () => {
    // The property the old assertion was protecting: no two distinct
    // principals may collide on one key.
    const first = makePrincipalKeyFromPublicSession({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "a:b",
    });
    const second = makePrincipalKeyFromPublicSession({
      bucket: "published",
      dashboardId: DASHBOARD_ID,
      snapshotRevision: "a%3Ab",
    });

    expect(first).not.toBe(second);
  });

  it("rejects an empty snapshotRevision", () => {
    expect(() => {
      return makePrincipalKeyFromPublicSession({
        bucket: "published",
        dashboardId: DASHBOARD_ID,
        snapshotRevision: "",
      });
    }).toThrow();
  });

  it("rejects an empty snapshotRevision", () => {
    expect(() => {
      return makePrincipalKeyFromPublicSession({
        bucket: "published",
        dashboardId: DASHBOARD_ID,
        snapshotRevision: "",
      });
    }).toThrow();
  });

  it("rejects a bucket outside the known snapshot bucket names", () => {
    expect(() => {
      return makePrincipalKeyFromPublicSession({
        bucket: "not-a-real-bucket",
        dashboardId: DASHBOARD_ID,
        snapshotRevision: "1",
      });
    }).toThrow();
  });

  it("rejects a dashboardId that is not a UUID, including one that could carry the ':' delimiter", () => {
    expect(() => {
      return makePrincipalKeyFromPublicSession({
        bucket: "published",
        dashboardId: "dash1",
        snapshotRevision: "1",
      });
    }).toThrow();
    expect(() => {
      return makePrincipalKeyFromPublicSession({
        bucket: "published",
        dashboardId: "a:b",
        snapshotRevision: "1",
      });
    }).toThrow();
  });
});

describe("makeIdentityTokensFromIdentity", () => {
  it("is deterministic for the same inputs", async () => {
    const identity = _makeIdentity();
    const [first, second] = await Promise.all([
      makeIdentityTokensFromIdentity(identity),
      makeIdentityTokensFromIdentity(identity),
    ]);
    expect(first.identityKey).toBe(second.identityKey);
  });

  it("changes when the principal changes", async () => {
    const a = await makeIdentityTokensFromIdentity(_makeIdentity());
    const b = await makeIdentityTokensFromIdentity(
      _makeIdentity({
        principal: makePrincipalKeyFromWorkspaceSession({
          workspaceId: OTHER_WORKSPACE_ID,
          userId: USER_ID,
        }),
      }),
    );
    expect(a.identityKey).not.toBe(b.identityKey);
  });

  it("changes when the relation changes", async () => {
    const a = await makeIdentityTokensFromIdentity(_makeIdentity());
    const b = await makeIdentityTokensFromIdentity(
      _makeIdentity({ relation: { kind: "dataset", id: OTHER_DATASET_ID } }),
    );
    expect(a.identityKey).not.toBe(b.identityKey);
  });

  it("changes when the definition text differs only by whitespace", async () => {
    const a = await makeIdentityTokensFromIdentity(
      _makeIdentity({
        definition: { kind: "virtual-sql", text: "select * from t" },
      }),
    );
    const b = await makeIdentityTokensFromIdentity(
      _makeIdentity({
        definition: { kind: "virtual-sql", text: "select *  from t" },
      }),
    );
    expect(a.identityKey).not.toBe(b.identityKey);
    expect(a.definitionToken).not.toBe(b.definitionToken);
  });

  it("changes when the source version changes, though it is never matched at lookup", async () => {
    const a = await makeIdentityTokensFromIdentity(
      _makeIdentity({ sourceVersion: "v1" }),
    );
    const b = await makeIdentityTokensFromIdentity(
      _makeIdentity({ sourceVersion: "v2" }),
    );
    expect(a.identityKey).not.toBe(b.identityKey);
  });

  it("gives a workspace and a public principal over the same relation and definition different identity keys", async () => {
    const workspace = await makeIdentityTokensFromIdentity(_makeIdentity());
    const publicPrincipal = await makeIdentityTokensFromIdentity(
      _makeIdentity({
        principal: makePrincipalKeyFromPublicSession({
          bucket: "published",
          dashboardId: DASHBOARD_ID,
          snapshotRevision: "1",
        }),
      }),
    );
    expect(workspace.identityKey).not.toBe(publicPrincipal.identityKey);
  });
});

describe("coversColumns", () => {
  it("hits when the cached set equals the needed set", () => {
    expect(coversColumns(["a", "b"], ["a", "b"])).toBe(true);
  });

  it("hits when the needed set is a subset of the cached set", () => {
    expect(coversColumns(["a", "b", "c"], ["a"])).toBe(true);
  });

  it("misses when the needed set is a superset of the cached set", () => {
    expect(coversColumns(["a"], ["a", "b"])).toBe(false);
  });

  it("treats cached 'all' as covering any request", () => {
    expect(coversColumns("all", ["a", "b"])).toBe(true);
    expect(coversColumns("all", "all")).toBe(true);
  });

  it("treats needed 'all' against a finite cached set as a miss", () => {
    expect(coversColumns(["a", "b"], "all")).toBe(false);
  });

  it("compares column names case-sensitively", () => {
    expect(coversColumns(["A"], ["a"])).toBe(false);
  });
});

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
      serves(entry, {
        principalKey: "w:ws:u",
        tableName: DATASET_ID,
        definitionToken: "d0",
        columns: ["a"],
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
      serves(entry, {
        principalKey: "p:published:dash1:1",
        tableName: DATASET_ID,
        definitionToken: "d0",
        columns: "all",
      }),
    ).toBe(false);
  });

  it("does not serve once staleAt is set", () => {
    const entry = {
      principalKey: "w:ws:u",
      tableName: DATASET_ID,
      definitionToken: "d0",
      columns: "all" as const,
      staleAt: Date.now(),
    };
    expect(
      serves(entry, {
        principalKey: "w:ws:u",
        tableName: DATASET_ID,
        definitionToken: "d0",
        columns: "all",
      }),
    ).toBe(false);
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
      serves(entry, {
        principalKey: "w:ws:u",
        tableName: DATASET_ID,
        definitionToken: "d1.bbbb",
        columns: "all",
      }),
    ).toBe(false);
  });
});

describe("makePreparedRelationCacheKeyFromKey", () => {
  it("carries the relation's table name, the principal and a definition token", async () => {
    const prepared = await makePreparedRelationCacheKeyFromKey({
      ..._makeIdentity(),
      columns: ["a"],
    });
    expect(prepared.principalKey).toBe(WORKSPACE_PRINCIPAL);
    expect(prepared.tableName).toBe(DATASET_ID);
    expect(prepared.columns).toEqual(["a"]);
    expect(prepared.definitionToken).toMatch(/^d1\./);
  });

  it("produces 'd0' for an undefined definition", async () => {
    const prepared = await makePreparedRelationCacheKeyFromKey({
      ..._makeIdentity({ definition: undefined }),
      columns: "all",
    });
    expect(prepared.definitionToken).toBe("d0");
  });
});

describe("normalizeColumns", () => {
  it("sorts and deduplicates a finite set, preserving case", () => {
    expect(normalizeColumns(["b", "a", "b", "A"])).toEqual(["A", "a", "b"]);
  });

  it("leaves 'all' alone", () => {
    expect(normalizeColumns("all")).toBe("all");
  });
});

describe("unionColumnSets", () => {
  it("returns 'all' when either side is 'all'", () => {
    expect(unionColumnSets("all", ["a"])).toBe("all");
    expect(unionColumnSets(["a"], "all")).toBe("all");
    expect(unionColumnSets("all", "all")).toBe("all");
  });

  it("sorts and deduplicates two finite sets, preserving case", () => {
    expect(unionColumnSets(["b"], ["a", "b"])).toEqual(["a", "b"]);
    expect(unionColumnSets(["A"], ["a"])).toEqual(["A", "a"]);
  });
});

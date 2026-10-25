import { describe, expect, it } from "vitest";
import {
  makeIdentityTokensFromIdentity,
  makePreparedRelationCacheKeyFromKey,
  makePrincipalKeyFromPublicSession,
  makePrincipalKeyFromWorkspaceSession,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.ts";
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

import { describe, expect, it } from "vitest";
import {
  makePrincipalKeyFromPublicSession,
  makePrincipalKeyFromWorkspaceSession,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.ts";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "33333333-3333-4333-8333-333333333333";
const DASHBOARD_ID = "44444444-4444-4444-8444-444444444444";

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

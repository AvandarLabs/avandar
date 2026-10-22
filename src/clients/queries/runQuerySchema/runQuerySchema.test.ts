import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import { runQuerySchema } from "./runQuerySchema";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { StructuredQueryAuth } from "@/clients/queries/runStructuredQuery/runStructuredQuery.types";

const { workspaceRead, snapshotRead, logEvent } = vi.hoisted<{
  workspaceRead: ReturnType<typeof vi.fn>;
  snapshotRead: ReturnType<typeof vi.fn>;
  logEvent: ReturnType<typeof vi.fn>;
}>(() => {
  return { workspaceRead: vi.fn(), snapshotRead: vi.fn(), logEvent: vi.fn() };
});
vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: workspaceRead } };
});
vi.mock("@/clients/qetl/PublicQuerySession/PublicQuerySession", () => {
  return { PublicQuerySession: { runQuery: snapshotRead } };
});
vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent } };
});
vi.mock(
  "@/clients/ontology/AttributeAssertionClient/AttributeAssertionClient",
  () => {
    return { AttributeAssertionClient: {} };
  },
);
vi.mock(
  "@/views/DataExplorerApp/makeExecutableQueryFromManualQuery/makeExecutableQueryFromManualQuery",
  () => {
    return { makeExecutableQueryFromManualQuery: vi.fn() };
  },
);
const WORKSPACE = uuid<Workspace.Id>();
const DASHBOARD = uuid<Dashboard.Id>();
const COLUMNS: QueryResult.Column[] = [{ name: "region", dataType: "varchar" }];
const SCHEMA_SQL =
  'SELECT * FROM (SELECT region FROM sales) AS "_ava_schema" LIMIT 0';
const CASES: Array<{
  auth: StructuredQueryAuth;
  expected: Record<string, string>;
}> = [
  {
    auth: { auth: "workspace", workspaceId: WORKSPACE },
    expected: { rawSql: SCHEMA_SQL, workspaceId: WORKSPACE },
  },
  {
    auth: {
      auth: "public",
      publicAvaPageId: DASHBOARD,
      snapshotRevision: "public-revision",
    },
    expected: {
      rawSql: SCHEMA_SQL,
      dashboardId: DASHBOARD,
      visibility: "public",
      snapshotRevision: "public-revision",
    },
  },
  {
    auth: {
      auth: "workspace_published",
      publicAvaPageId: DASHBOARD,
      snapshotRevision: "private-revision",
    },
    expected: {
      rawSql: SCHEMA_SQL,
      dashboardId: DASHBOARD,
      visibility: "workspace",
      snapshotRevision: "private-revision",
    },
  },
];
beforeEach(() => {
  vi.clearAllMocks();
  workspaceRead.mockResolvedValue({
    ...QueryResult.makeEmpty(),
    columns: COLUMNS,
  });
  snapshotRead.mockResolvedValue({
    ...QueryResult.makeEmpty(),
    columns: COLUMNS,
  });
});
describe("runQuerySchema", () => {
  it.each(CASES)(
    "reads zero-row metadata with $auth.auth execution credentials",
    async ({ auth, expected }) => {
      const columns = await runQuerySchema({
        rawSql: " SELECT region FROM sales; ",
        auth,
      });
      expect(columns).toEqual([{ name: "region", dataType: "varchar" }]);
      expect(
        auth.auth === "workspace" ? workspaceRead : snapshotRead,
      ).toHaveBeenCalledExactlyOnceWith(expected);
      expect(
        auth.auth === "workspace" ? snapshotRead : workspaceRead,
      ).not.toHaveBeenCalled();
      expect(logEvent).not.toHaveBeenCalled();
    },
  );
});

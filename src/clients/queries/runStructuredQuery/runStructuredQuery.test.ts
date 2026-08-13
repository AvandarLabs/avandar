import { describe, expect, it, vi } from "vitest";

const runQueryMock = vi.fn();

vi.mock("@/clients/qetl/WorkspaceQETLClient", () => {
  return { WorkspaceQETLClient: { runQuery: runQueryMock } };
});
vi.mock("@/clients/qetl/PublicQETLClient", () => {
  return { PublicQETLClient: { runQuery: vi.fn() } };
});

const { runStructuredQuery } =
  await import("@/clients/queries/runStructuredQuery/runStructuredQuery");
const { StructuredQuery } =
  await import("$/models/queries/StructuredQuery/StructuredQuery");

describe("runStructuredQuery", () => {
  it("runs caller-supplied raw SQL verbatim", async () => {
    runQueryMock.mockResolvedValue({
      id: "r1",
      data: [],
      columns: [],
      numRows: 0,
    });
    await runStructuredQuery({
      auth: "workspace",
      workspaceId: "workspace-1" as never,
      query: StructuredQuery.makeEmpty(),
      rawSql: "SELECT 1 AS one",
    });
    expect(runQueryMock).toHaveBeenCalledWith({
      rawSql: "SELECT 1 AS one",
      workspaceId: "workspace-1",
    });
  });

  it("returns an empty result when there is nothing to run", async () => {
    runQueryMock.mockClear();
    const result = await runStructuredQuery({
      auth: "workspace",
      workspaceId: "workspace-1" as never,
      query: StructuredQuery.makeEmpty(),
      rawSql: undefined,
    });
    expect(runQueryMock).not.toHaveBeenCalled();
    expect(result.numRows).toBe(0);
    expect(result.data).toEqual([]);
  });

  it("rejects a structured query on the public path", async () => {
    await expect(
      runStructuredQuery({
        auth: "public",
        publicAvaPageId: "page-1" as never,
        query: StructuredQuery.makeEmpty(),
        rawSql: undefined,
      }),
    ).rejects.toThrow(/raw SQL/i);
  });
});

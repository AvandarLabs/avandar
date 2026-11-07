import { describe, expect, it, vi } from "vitest";
import { renderHook, TestProviders } from "@/test-utils";
import { useDiscoveryResolver } from "./useDiscoveryResolver";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111" as Workspace.Id;
const DISCOVERY_SQL = `SELECT DISTINCT "Province_State" FROM "8fc84d6a-f864-46fe-bd1c-7d7cb897a173" ORDER BY 1 LIMIT 100`;

const { runQueryMock } = vi.hoisted(() => {
  return { runQueryMock: vi.fn() };
});

vi.mock("@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession", () => {
  return { WorkspaceQuerySession: { runQuery: runQueryMock } };
});

function _renderResolver() {
  return renderHook(
    () => {
      return useDiscoveryResolver(WORKSPACE_ID);
    },
    { wrapper: TestProviders },
  ).result.current;
}

describe("useDiscoveryResolver", () => {
  it("runs the lookup through the workspace session, which loads the dataset first", async () => {
    runQueryMock.mockResolvedValueOnce({
      data: [{ Province_State: "California" }, { Province_State: "Texas" }],
    });
    const resolveDiscovery = _renderResolver();

    const result = await resolveDiscovery({
      query: DISCOVERY_SQL,
      column: "Province_State",
    });

    expect(runQueryMock).toHaveBeenCalledWith({
      rawSql: DISCOVERY_SQL,
      workspaceId: WORKSPACE_ID,
    });
    expect(result).toEqual({ values: ["California", "Texas"] });
  });

  it("returns the query error so the card can explain it", async () => {
    runQueryMock.mockRejectedValueOnce(
      new Error('Binder Error: Referenced column "State" not found'),
    );
    const resolveDiscovery = _renderResolver();

    const result = await resolveDiscovery({
      query: DISCOVERY_SQL,
      column: "State",
    });

    expect(result).toEqual({
      error: 'Binder Error: Referenced column "State" not found',
    });
  });

  it("puts candidate matches first even when the lookup's own list cuts them off", async () => {
    runQueryMock
      .mockResolvedValueOnce({
        data: [
          { "Country/Region": "Afghanistan" },
          { "Country/Region": "Albania" },
        ],
      })
      .mockResolvedValueOnce({
        data: [{ "Country/Region": "United Kingdom" }],
      });
    const resolveDiscovery = _renderResolver();

    const result = await resolveDiscovery({
      query: `SELECT DISTINCT "Country/Region" FROM "b3ce316e-d9e5-4279-89d7-bf42ab0d68fb" ORDER BY 1 LIMIT 100`,
      column: "Country/Region",
      candidateValues: ["UK", "United Kingdom"],
    });

    expect(runQueryMock).toHaveBeenLastCalledWith({
      rawSql: expect.stringContaining("IN ('uk', 'united kingdom')"),
      workspaceId: WORKSPACE_ID,
    });
    expect(result).toEqual({
      values: ["United Kingdom", "Afghanistan", "Albania"],
    });
  });
});

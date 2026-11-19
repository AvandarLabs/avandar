import { afterEach, describe, expect, it, vi } from "vitest";
import {
  appendBlockToDashboard,
  canEditDashboard,
  loadWorkspaceDashboardCandidates,
} from "@/clients/dashboards/agentDashboards/agentDashboards";
import type { Workspace } from "$/models/Workspace/Workspace";

const {
  getAllMock,
  getByIdMock,
  canAccessMock,
  updateIfUnchangedMock,
  prepareDocumentMock,
  invalidateMock,
} = vi.hoisted(() => {
  return {
    getAllMock: vi.fn(),
    getByIdMock: vi.fn(),
    canAccessMock: vi.fn(),
    updateIfUnchangedMock: vi.fn(),
    prepareDocumentMock: vi.fn(),
    invalidateMock: vi.fn(),
  };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return {
    DashboardClient: {
      getAll: getAllMock,
      getById: getByIdMock,
      QueryKeys: {
        getAll: () => {
          return ["dashboards", "getAll"];
        },
        getById: ({ id }: { id: string }) => {
          return ["dashboards", "getById", id];
        },
      },
    },
  };
});
vi.mock("@/clients/UserClient", () => {
  return { UserClient: { canAccessResource: canAccessMock } };
});
vi.mock("@/clients/dashboards/updateDashboardRowIfUnchanged", () => {
  return { updateDashboardRowIfUnchanged: updateIfUnchangedMock };
});
vi.mock(
  "@/views/DashboardApp/AvaPage/utils/DashboardColumnBindingPreparation/DashboardColumnBindingPreparation",
  () => {
    return {
      DashboardColumnBindingPreparation: {
        prepareDocument: prepareDocumentMock,
      },
    };
  },
);
vi.mock("@/config/AvaQueryClient", () => {
  return { AvaQueryClient: { invalidateQueries: invalidateMock } };
});
vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: () => {
        return {};
      },
    },
  };
});

const DASHBOARD = {
  id: "d-1",
  name: "COVID 2022",
  updatedAt: "2026-11-10T10:00:00Z",
  config: { root: { props: { title: "COVID 2022" } }, content: [] },
};
const HEADING = { kind: "HeadingBlock", text: "Deaths" } as const;
const APPEND_OPTIONS = {
  workspaceId: "ws-1" as Workspace.Id,
  dashboardId: "d-1",
  block: HEADING,
} as const;

function _givenEditableDashboard(): void {
  canAccessMock.mockResolvedValue(true);
  getByIdMock.mockResolvedValue(DASHBOARD);
  prepareDocumentMock.mockImplementation(async ({ data }) => {
    return data;
  });
}

afterEach(() => {
  vi.resetAllMocks();
});

describe("loadWorkspaceDashboardCandidates", () => {
  it("lists the workspace's dashboards with chart counts", async () => {
    getAllMock.mockResolvedValue([DASHBOARD]);

    await expect(loadWorkspaceDashboardCandidates("ws-1")).resolves.toEqual([
      {
        id: "d-1",
        name: "COVID 2022",
        chartCount: 0,
        updatedAt: "2026-11-10T10:00:00Z",
      },
    ]);
    expect(getAllMock).toHaveBeenCalledWith({
      where: { workspace_id: { eq: "ws-1" } },
    });
  });
});

describe("canEditDashboard", () => {
  it("asks for the editor role on the dashboard", async () => {
    canAccessMock.mockResolvedValue(true);

    await expect(canEditDashboard("d-1")).resolves.toBe(true);
    expect(canAccessMock).toHaveBeenCalledWith({
      resourceType: "dashboard",
      resourceId: "d-1",
      minRole: "editor",
    });
  });
});

describe("appendBlockToDashboard", () => {
  it("appends the block, prepares bindings, and saves if unchanged", async () => {
    _givenEditableDashboard();
    updateIfUnchangedMock.mockResolvedValue({ id: "d-1" });

    await expect(appendBlockToDashboard(APPEND_OPTIONS)).resolves.toEqual({
      kind: "saved",
    });
    const preparedCall = prepareDocumentMock.mock.calls[0]![0];
    expect(preparedCall.data.content).toHaveLength(1);
    expect(preparedCall.data.content[0].type).toBe("HeadingBlock");
    expect(preparedCall.auth).toEqual({
      auth: "workspace",
      workspaceId: "ws-1",
    });
    expect(invalidateMock).toHaveBeenCalled();
  });

  it("reads again and retries once when the row changed", async () => {
    _givenEditableDashboard();
    updateIfUnchangedMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ id: "d-1" });

    await expect(appendBlockToDashboard(APPEND_OPTIONS)).resolves.toEqual({
      kind: "saved",
    });
    expect(getByIdMock).toHaveBeenCalledTimes(2);
  });

  it("gives up as stale after the retry", async () => {
    _givenEditableDashboard();
    updateIfUnchangedMock.mockResolvedValue(undefined);

    await expect(appendBlockToDashboard(APPEND_OPTIONS)).resolves.toEqual({
      kind: "stale",
    });
  });

  it("is unavailable when the user lost edit access or the row is gone", async () => {
    canAccessMock.mockResolvedValue(false);

    await expect(appendBlockToDashboard(APPEND_OPTIONS)).resolves.toEqual({
      kind: "unavailable",
    });

    canAccessMock.mockResolvedValue(true);
    getByIdMock.mockResolvedValue(undefined);

    await expect(appendBlockToDashboard(APPEND_OPTIONS)).resolves.toEqual({
      kind: "unavailable",
    });
  });

  it("reports a failed request as a network failure", async () => {
    canAccessMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(appendBlockToDashboard(APPEND_OPTIONS)).resolves.toEqual({
      kind: "failed",
    });
  });
});

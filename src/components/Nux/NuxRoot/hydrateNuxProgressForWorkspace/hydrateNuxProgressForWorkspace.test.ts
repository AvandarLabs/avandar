import { beforeEach, describe, expect, it, vi } from "vitest";
import { hydrateNuxProgressForWorkspace } from "@/components/Nux/NuxRoot/hydrateNuxProgressForWorkspace/hydrateNuxProgressForWorkspace";
import type { NuxWorkspaceArtifacts } from "@/clients/NuxProgressClient/NuxProgressClient";
import type { NuxProgress } from "$/models/NuxProgress/NuxProgress";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333" as Workspace.Id;
const PROGRESS_ID = "11111111-1111-4111-8111-111111111111" as NuxProgress.Id;

const {
  ensureForCurrentUserMock,
  getWorkspaceArtifactsMock,
  updateProgressMock,
} = vi.hoisted(() => {
  return {
    ensureForCurrentUserMock: vi.fn(),
    getWorkspaceArtifactsMock: vi.fn(),
    updateProgressMock: vi.fn(),
  };
});

vi.mock("@/clients/NuxProgressClient/NuxProgressClient", () => {
  return {
    NuxProgressClient: {
      ensureForCurrentUser: ensureForCurrentUserMock,
      getWorkspaceArtifacts: getWorkspaceArtifactsMock,
      updateProgress: updateProgressMock,
    },
  };
});

function createProgressRow(
  overrides: Partial<NuxProgress.T> = {},
): NuxProgress.T {
  return {
    progressId: PROGRESS_ID,
    userId: "22222222-2222-4222-8222-222222222222" as NuxProgress.T["userId"],
    tutorialKey: "first_dashboard",
    status: "not_started",
    completedMilestones: [],
    isCatchUpSuppressed: false,
    createdAt: new Date("2026-08-16T00:00:00.000Z"),
    updatedAt: new Date("2026-08-16T00:00:00.000Z"),
    ...overrides,
  };
}

function createArtifacts(
  overrides: Partial<NuxWorkspaceArtifacts> = {},
): NuxWorkspaceArtifacts {
  return {
    hasDataset: false,
    hasDashboard: false,
    hasPublishedDashboard: false,
    latestDashboardId: undefined,
    ...overrides,
  };
}

describe("hydrateNuxProgressForWorkspace", () => {
  beforeEach(() => {
    ensureForCurrentUserMock.mockReset();
    getWorkspaceArtifactsMock.mockReset();
    updateProgressMock.mockReset();
    getWorkspaceArtifactsMock.mockResolvedValue(createArtifacts());
    updateProgressMock.mockImplementation(({ data }) => {
      return Promise.resolve(
        createProgressRow({
          status: data.status ?? "not_started",
          completedMilestones: data.completedMilestones ?? [],
        }),
      );
    });
  });

  it("returns an empty row when not_started and artifacts are empty", async () => {
    ensureForCurrentUserMock.mockResolvedValue(createProgressRow());

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(updateProgressMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      progressId: PROGRESS_ID,
      status: "not_started",
      completedMilestones: [],
      isCatchUpSuppressed: false,
    });
  });

  it("catch-up writes add_dataset when a dataset exists", async () => {
    ensureForCurrentUserMock.mockResolvedValue(createProgressRow());
    getWorkspaceArtifactsMock.mockResolvedValue(
      createArtifacts({ hasDataset: true }),
    );

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(updateProgressMock).toHaveBeenCalledWith({
      progressId: PROGRESS_ID,
      data: {
        status: "not_started",
        completedMilestones: ["add_dataset"],
      },
    });
    expect(result).toEqual({
      progressId: PROGRESS_ID,
      status: "not_started",
      completedMilestones: ["add_dataset"],
      isCatchUpSuppressed: false,
    });
  });

  it("catch-up writes artifact milestones but not run_query", async () => {
    ensureForCurrentUserMock.mockResolvedValue(createProgressRow());
    getWorkspaceArtifactsMock.mockResolvedValue(
      createArtifacts({
        hasDataset: true,
        hasDashboard: true,
        hasPublishedDashboard: true,
      }),
    );

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(updateProgressMock).toHaveBeenCalledWith({
      progressId: PROGRESS_ID,
      data: {
        status: "not_started",
        completedMilestones: [
          "add_dataset",
          "build_dashboard",
          "share_dashboard",
        ],
      },
    });
    expect(result.status).toBe("not_started");
    expect(result.completedMilestones).toEqual([
      "add_dataset",
      "build_dashboard",
      "share_dashboard",
    ]);
  });

  it("does not catch-up share_dashboard when the dashboard is still draft", async () => {
    ensureForCurrentUserMock.mockResolvedValue(createProgressRow());
    getWorkspaceArtifactsMock.mockResolvedValue(
      createArtifacts({
        hasDataset: true,
        hasDashboard: true,
        hasPublishedDashboard: false,
      }),
    );

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(updateProgressMock).toHaveBeenCalledWith({
      progressId: PROGRESS_ID,
      data: {
        status: "not_started",
        completedMilestones: ["add_dataset", "build_dashboard"],
      },
    });
    expect(result.completedMilestones).toEqual([
      "add_dataset",
      "build_dashboard",
    ]);
  });

  it("skips catch-up when in_progress and catch-up is suppressed", async () => {
    ensureForCurrentUserMock.mockResolvedValue(
      createProgressRow({
        status: "in_progress",
        isCatchUpSuppressed: true,
      }),
    );
    getWorkspaceArtifactsMock.mockResolvedValue(
      createArtifacts({ hasDataset: true }),
    );

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(getWorkspaceArtifactsMock).not.toHaveBeenCalled();
    expect(updateProgressMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      progressId: PROGRESS_ID,
      status: "in_progress",
      completedMilestones: [],
      isCatchUpSuppressed: true,
    });
  });

  it("catch-up writes add_dataset for in_progress when not suppressed", async () => {
    ensureForCurrentUserMock.mockResolvedValue(
      createProgressRow({ status: "in_progress" }),
    );
    getWorkspaceArtifactsMock.mockResolvedValue(
      createArtifacts({ hasDataset: true }),
    );

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(updateProgressMock).toHaveBeenCalledWith({
      progressId: PROGRESS_ID,
      data: {
        status: "in_progress",
        completedMilestones: ["add_dataset"],
      },
    });
    expect(result.completedMilestones).toEqual(["add_dataset"]);
  });

  it("skips catch-up when dismissed", async () => {
    ensureForCurrentUserMock.mockResolvedValue(
      createProgressRow({
        status: "dismissed",
        completedMilestones: ["add_dataset"],
      }),
    );
    getWorkspaceArtifactsMock.mockResolvedValue(
      createArtifacts({ hasDataset: true }),
    );

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(getWorkspaceArtifactsMock).not.toHaveBeenCalled();
    expect(updateProgressMock).not.toHaveBeenCalled();
    expect(result.status).toBe("dismissed");
  });

  it("skips catch-up when completed", async () => {
    ensureForCurrentUserMock.mockResolvedValue(
      createProgressRow({
        status: "completed",
        completedMilestones: [
          "add_dataset",
          "run_query",
          "build_dashboard",
          "share_dashboard",
        ],
      }),
    );
    getWorkspaceArtifactsMock.mockResolvedValue(
      createArtifacts({
        hasDataset: true,
        hasDashboard: true,
        hasPublishedDashboard: true,
      }),
    );

    const result = await hydrateNuxProgressForWorkspace(WORKSPACE_ID);

    expect(getWorkspaceArtifactsMock).not.toHaveBeenCalled();
    expect(updateProgressMock).not.toHaveBeenCalled();
    expect(result.status).toBe("completed");
  });
});

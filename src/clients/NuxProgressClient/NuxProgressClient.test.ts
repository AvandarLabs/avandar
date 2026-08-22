import { describe, expect, it } from "vitest";
import {
  createNuxWorkspaceArtifacts,
  getNuxWorkspaceArtifactsQueryKey,
  NuxProgressClient,
  NuxProgressDBReadToModelReadSchema,
} from "@/clients/NuxProgressClient/NuxProgressClient";
import type { Workspace } from "$/models/Workspace/Workspace";

const DB_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  user_id: "22222222-2222-4222-8222-222222222222",
  tutorial_key: "first_dashboard",
  status: "in_progress",
  completed_milestones: ["add_dataset"],
  catch_up_suppressed: false,
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
};

describe("NuxProgressDBReadToModelReadSchema", () => {
  it("camel-cases the row and renames id to progressId", () => {
    const model = NuxProgressDBReadToModelReadSchema.parse(DB_ROW);
    expect(model.progressId).toBe(DB_ROW.id);
    expect(model.userId).toBe(DB_ROW.user_id);
    expect(model.status).toBe("in_progress");
    expect(model.createdAt).toBeInstanceOf(Date);
  });

  it("drops milestone keys this build does not recognise", () => {
    const model = NuxProgressDBReadToModelReadSchema.parse({
      ...DB_ROW,
      completed_milestones: ["add_dataset", "retired_milestone", "run_query"],
    });
    expect(model.completedMilestones).toEqual(["add_dataset", "run_query"]);
  });

  it("maps catch_up_suppressed to isCatchUpSuppressed", () => {
    const model = NuxProgressDBReadToModelReadSchema.parse({
      ...DB_ROW,
      catch_up_suppressed: true,
    });
    expect(model.isCatchUpSuppressed).toBe(true);
  });
});

describe("getNuxWorkspaceArtifactsQueryKey", () => {
  it("is a prefix of a workspace-scoped artifacts query", () => {
    const prefix = getNuxWorkspaceArtifactsQueryKey();
    const scoped = NuxProgressClient.QueryKeys.getWorkspaceArtifacts({
      workspaceId: "33333333-3333-4333-8333-333333333333" as Workspace.Id,
    });
    expect(scoped.slice(0, prefix.length)).toEqual(prefix);
  });
});

describe("createNuxWorkspaceArtifacts", () => {
  it("does not treat a newly created dashboard as already published", () => {
    expect(
      createNuxWorkspaceArtifacts({
        datasetCount: 1,
        latestDashboardId: "dash-1",
        publishedDashboardCount: 0,
      }),
    ).toEqual({
      hasDataset: true,
      hasDashboard: true,
      hasPublishedDashboard: false,
      latestDashboardId: "dash-1",
    });
  });

  it("treats a published dashboard as satisfying Share catch-up", () => {
    expect(
      createNuxWorkspaceArtifacts({
        datasetCount: 0,
        latestDashboardId: "dash-1",
        publishedDashboardCount: 1,
      }).hasPublishedDashboard,
    ).toBe(true);
  });
});

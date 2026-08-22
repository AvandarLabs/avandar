import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Identifiers and the base dashboard row the transition tests build on. */
import { Model } from "@avandar/models";

export const DASHBOARD_ID =
  "11111111-1111-4111-8111-111111111111" as Dashboard.Id;
export const WORKSPACE_ID =
  "22222222-2222-4222-8222-222222222222" as Workspace.Id;
export const DATASET_IDS = [
  "33333333-3333-4333-8333-333333333333" as Dataset.Id,
  "44444444-4444-4444-8444-444444444444" as Dataset.Id,
  "55555555-5555-4555-8555-555555555555" as Dataset.Id,
  "66666666-6666-4666-8666-666666666666" as Dataset.Id,
] as const;
export const SNAPSHOT_REVISION = "99999999-9999-4999-8999-999999999999";
export const PREVIOUS_REVISION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const CLEANUP_REVISION = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
export const WINNING_REVISION = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

/** The dashboard row state the database mocks keep between calls. */
export type VisibilityState = {
  current: Dashboard.Visibility;
  isDashboardDeleted: boolean;
  pending: Dashboard.Visibility | undefined;
  snapshotRevision: string | undefined;
  pendingSnapshotRevision: string | undefined;
  shouldUpdateSnapshotRevision: boolean;
  snapshotTransitionKind: Dashboard.SnapshotTransitionKind | undefined;
  snapshotTransitionPriorRevision: string | undefined;
  snapshotTransitionPriorVisibility: Dashboard.Visibility | undefined;
  snapshotTransitionRevision: string | undefined;
  snapshotTransitionTargetVisibility: Dashboard.Visibility | undefined;
  updatedAt: string;
};

export const DASHBOARD = Model.make("Dashboard", {
  id: DASHBOARD_ID,
  workspaceId: WORKSPACE_ID,
  config: {},
  createdAt: "2026-08-14T00:00:00.000Z",
  description: undefined,
  visibility: "draft",
  isPublic: false,
  isRestricted: false,
  name: "Dashboard",
  ownerId: "77777777-7777-4777-8777-777777777777" as Dashboard.T["ownerId"],
  ownerProfileId:
    "88888888-8888-4888-8888-888888888888" as Dashboard.T["ownerProfileId"],
  slug: "existing-slug",
  updatedAt: "2026-08-14T00:00:00.000Z",
});

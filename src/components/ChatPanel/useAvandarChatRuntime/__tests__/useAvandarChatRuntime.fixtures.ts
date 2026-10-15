import { Model } from "@avandar/models";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/** The reply the chat gives once applied SQL has returned rows. */
export const RESULTS_READY = "I ran the query. Your results are ready.";

/** The signed-in user, a member of both workspaces. */
export const USER_ID = "11111111-1111-4111-8111-111111111111" as User.Id;

/** A dataset that belongs only to workspace A. */
export const DATASET_A_ID =
  "a1111111-1111-4111-8111-111111111111" as Dataset.Id;

/** A dataset that belongs only to workspace B. */
export const DATASET_B_ID =
  "b2222222-2222-4222-8222-222222222222" as Dataset.Id;

/** The user's question in workspace A. */
export const WORKSPACE_A_QUESTION = "cuantos casos hay por region en alpha";

/** The user's question in workspace B. */
export const WORKSPACE_B_QUESTION = "cuantos casos hay en beta";

function _makeWorkspace(id: string, slug: string): Workspace.WithSubscription {
  return Model.make("Workspace", {
    id: id as Workspace.Id,
    ownerId: USER_ID,
    name: slug,
    slug,
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    subscription: undefined,
  });
}

/** The workspace the session starts in, at `/alpha`. */
export const WORKSPACE_A = _makeWorkspace(
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "alpha",
);

/** The workspace the user switches to, at `/beta`. */
export const WORKSPACE_B = _makeWorkspace(
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "beta",
);

/** Builds a statement that reads `datasetId` and nothing else. */
export function makeSqlFromDatasetId(datasetId: string): string {
  return `SELECT "region", COUNT(*) AS "casos" FROM "${datasetId}" GROUP BY "region"`;
}

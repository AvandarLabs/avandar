import { useIsUnderDatasetLimit } from "@/hooks/datasets/useIsUnderDatasetLimit/useIsUnderDatasetLimit";
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import { useCanCreateDatasets } from "@/hooks/workspaces/useCanCreateDatasets/useCanCreateDatasets";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** Why the user cannot save the combined dataset. */
export type CombineDeniedReason =
  /** Creating needs a workspace owner or Settings admin. */
  | "not_admin"
  /** Creating would pass the plan's dataset limit. */
  | "dataset_limit"
  /** Updating needs edit access to the combined dataset. */
  | "not_dataset_editor"
  /** The user's role on the combined dataset could not be read. */
  | "failed";

/** Whether the user may create or update the combined dataset yet. */
export type CombineAccess =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "denied"; reason: CombineDeniedReason };

/**
 * Updating's access: editor or admin on the combined dataset. A role that
 * is not known yet counts as checking, while `null` means no access, as
 * `useApplyAccess` reads it.
 */
function useUpdateAccess(
  outputDatasetId: Dataset.Id | undefined,
): CombineAccess {
  const [role, isRoleLoading, hasRoleFailed] = useResourceRole({
    resourceType: "dataset",
    resourceId: outputDatasetId,
  });
  if (hasRoleFailed) {
    return { status: "denied", reason: "failed" };
  }
  if (isRoleLoading || role === undefined) {
    return { status: "checking" };
  }
  return role === "editor" || role === "admin"
    ? { status: "allowed" }
    : { status: "denied", reason: "not_dataset_editor" };
}

/**
 * Whether the user may save the combined dataset: creating it needs the
 * people who may add datasets, under the plan's dataset limit. Updating it
 * needs edit access to it. The server checks both again.
 */
export function useCombineAccess(
  outputDatasetId: Dataset.Id | undefined,
): CombineAccess {
  const canCreateDatasets = useCanCreateDatasets();
  const isUnderDatasetLimit = useIsUnderDatasetLimit();
  const updateAccess = useUpdateAccess(outputDatasetId);
  if (outputDatasetId) {
    return updateAccess;
  }
  if (!canCreateDatasets) {
    return { status: "denied", reason: "not_admin" };
  }
  return isUnderDatasetLimit
    ? { status: "allowed" }
    : { status: "denied", reason: "dataset_limit" };
}

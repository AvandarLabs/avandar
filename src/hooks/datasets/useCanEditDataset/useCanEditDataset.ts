import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/**
 * Whether the signed-in user may edit one dataset, from their effective
 * role on it (an app role or a share). Use it to offer an action only to
 * people the server will let do it, such as applying a dictionary.
 */
export function useCanEditDataset(datasetId: Dataset.Id | undefined): {
  canEdit: boolean;
  isLoading: boolean;
} {
  const [role, isLoading] = useResourceRole({
    resourceType: "dataset",
    resourceId: datasetId,
  });
  return { canEdit: role === "editor" || role === "admin", isLoading };
}

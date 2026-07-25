import { useQuery } from "@hooks";
import { useMemo } from "react";
import { AvaDexie } from "@/db/dexie/AvaDexie";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

/** Dataset ids with parquet cached locally for the current user/workspace. */
export function useLocalDatasetIds(): Set<DatasetId> {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const userId = userProfile?.userId;

  const [rows] = useQuery({
    queryKey: ["offline", "localDatasetIds", userId, workspace.id],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      return AvaDexie.DB.LocalDataset.where({
        userId: userId!,
        workspaceId: workspace.id,
      }).toArray();
    },
  });

  return useMemo(() => {
    return new Set(
      (rows ?? []).map((row) => {
        return row.datasetId;
      }),
    );
  }, [rows]);
}

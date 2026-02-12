import { where } from "$/lib/utils/filters/filters";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useMutation } from "@/lib/hooks/query/useMutation";
import type { UseMutationResultTuple } from "@/lib/hooks/query/useMutation";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";

type UseNLPQueryVariables = {
  prompt: string;
};

export function useNLPQuery({
  workspaceId,
  onSuccess,
}: {
  workspaceId: WorkspaceId;
  onSuccess: (sql: string, mutationVars: UseNLPQueryVariables) => void;
}): UseMutationResultTuple<string, UseNLPQueryVariables> {
  return useMutation({
    mutationFn: async ({ prompt }: UseNLPQueryVariables) => {
      const datasets = await DatasetClient.getAll(
        where("workspace_id", "eq", workspaceId),
      );
      const firstDataset = datasets[0];
      if (!firstDataset) {
        throw new Error("No datasets found");
      }

      const { sql } = await APIClient.get({
        route: "queries/:workspaceId/generate",
        pathParams: {
          workspaceId: workspaceId,
        },
        queryParams: {
          prompt: prompt,
        },
      });
      return sql;
    },
    onSuccess,
  });
}

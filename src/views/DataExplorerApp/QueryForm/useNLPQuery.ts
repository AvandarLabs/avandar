import { useMutation } from "@hooks/useMutation/useMutation";
import { where } from "@utils/filters/where/where";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import type { UseMutationResultTuple } from "@hooks/useMutation/useMutation";
import type { Workspace } from "$/models/Workspace/Workspace";

type UseNLPQueryVariables = {
  prompt: string;
};

export function useNLPQuery({
  workspaceId,
  onSuccess,
}: {
  workspaceId: Workspace.Id;
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

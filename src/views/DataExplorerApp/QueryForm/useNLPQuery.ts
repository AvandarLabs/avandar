import type { Workspace } from "$/models/Workspace/Workspace";
import type { UseMutationResultTuple } from "@avandar/query-hooks";

import { useMutation } from "@avandar/query-hooks";
import { where } from "@avandar/utils";

import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";

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

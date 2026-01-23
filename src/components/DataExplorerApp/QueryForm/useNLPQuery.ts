import { where } from "$/lib/utils/filters/filters";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useMutation } from "@/lib/hooks/query/useMutation";
import type { UseMutationResultTuple } from "@/lib/hooks/query/useMutation";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";

type UseNLPQueryOptions = {
  workspaceId: WorkspaceId;
  onSuccess: (sql: string) => void;
};

type NLPQueryMutationOptions = {
  prompt: string;
};

export function useNLPQuery(
  options: UseNLPQueryOptions,
): UseMutationResultTuple<string, NLPQueryMutationOptions> {
  return useMutation({
    mutationFn: async (mutationOptions) => {
      const datasets = await DatasetClient.getAll(
        where("workspace_id", "eq", options.workspaceId),
      );
      const firstDataset = datasets[0];
      if (!firstDataset) {
        throw new Error("No datasets found");
      }

      const { sql } = await APIClient.get({
        route: "queries/:workspaceId/generate",
        pathParams: {
          workspaceId: options.workspaceId,
        },
        queryParams: {
          prompt: mutationOptions.prompt,
        },
      });
      return sql;
    },
    onSuccess: (sql) => {
      options.onSuccess(sql);
    },
  });
}

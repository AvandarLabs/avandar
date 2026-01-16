import { where } from "$/lib/utils/filters/filters";
import { APIClient } from "@/clients/APIClient";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import type { WorkspaceId } from "@/models/Workspace/Workspace.types";

export async function generateSQLFromPrompt(options: {
  prompt: string;
  workspaceId: WorkspaceId;
}): Promise<string> {
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
      prompt: options.prompt,
    },
  });

  return sql;
}

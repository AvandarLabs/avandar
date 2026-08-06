import { where } from "@utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { OfflineChatSchemaCache } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/OfflineChatSchemaCache";
import { truncateSchemaForOffline } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { OfflineChatSchema } from "$/types/offlineChat.types";

function mapFromDatasetClient(rows: Dataset.WithColumns[]): OfflineChatSchema {
  const datasets = rows.map((row) => {
    return { id: row.id, name: row.name };
  });
  const columns = rows.flatMap((row) => {
    return row.columns.map((column) => {
      return {
        dataset_id: row.id,
        name: column.name,
        data_type: column.dataType,
      };
    });
  });
  return { datasets, columns };
}

/**
 * Loads workspace schema for offline prompts. Uses Supabase when online and
 * caches to sessionStorage; when offline uses the cache only.
 */
export async function fetchOfflineChatSchema(args: {
  workspace: Workspace.T;
  openDatasetId?: string;
  navigatorOnLine: boolean;
}): Promise<OfflineChatSchema> {
  const cached = OfflineChatSchemaCache.read(args.workspace.id);

  if (args.navigatorOnLine) {
    try {
      const rows = await DatasetClient.getAllDatasetsWithColumns(
        where("workspace_id", "eq", args.workspace.id),
      );
      const schema = mapFromDatasetClient(rows);
      OfflineChatSchemaCache.write(args.workspace.id, schema);
      return truncateSchemaForOffline(schema, args.openDatasetId);
    } catch {
      if (cached) {
        return truncateSchemaForOffline(cached, args.openDatasetId);
      }
    }
  }

  if (cached) {
    return truncateSchemaForOffline(cached, args.openDatasetId);
  }

  return { datasets: [], columns: [] };
}

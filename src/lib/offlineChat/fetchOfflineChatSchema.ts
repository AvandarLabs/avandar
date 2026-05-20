import { where } from "@utils";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import {
  readCachedOfflineChatSchema,
  writeCachedOfflineChatSchema,
} from "./offlineChatSchemaCache";
import { truncateSchemaForOffline } from "./truncateSchemaForOffline";
import type { OfflineChatSchema } from "./offlineChat.types";
import type { DatasetWithColumns } from "$/models/datasets/Dataset/Dataset.types";
import type { Workspace } from "$/models/Workspace/Workspace";

function mapFromDatasetClient(rows: DatasetWithColumns[]): OfflineChatSchema {
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
  const cached = readCachedOfflineChatSchema(args.workspace.id);

  if (args.navigatorOnLine) {
    try {
      const rows = await DatasetClient.getAllDatasetsWithColumns({
        where: where("workspace_id", "eq", args.workspace.id),
      });
      const schema = mapFromDatasetClient(rows);
      writeCachedOfflineChatSchema(args.workspace.id, schema);
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

import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { OfflineChatSchema } from "$/types/offlineChat.types";

import { where } from "@avandar/utils";

import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { ConceptClient } from "@/clients/ontology/ConceptClient";
import { OfflineChatSchemaCache } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/OfflineChatSchemaCache";
import { truncateSchemaForOffline } from "@/components/ChatPanel/useAvandarChatRuntime/runOfflineChatTurn/fetchOfflineChatSchema/truncateSchemaForOffline/truncateSchemaForOffline";

const EMPTY_SCHEMA: OfflineChatSchema = {
  datasets: [],
  columns: [],
  concepts: [],
  conceptAttributes: [],
};

function _mapDatasets(
  rows: readonly Dataset.WithColumns[],
): Pick<OfflineChatSchema, "datasets" | "columns"> {
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

function _mapConcepts(
  concepts: readonly Concept.T[],
  attributes: readonly ConceptAttribute.T[],
): Pick<OfflineChatSchema, "concepts" | "conceptAttributes"> {
  return {
    concepts: concepts.map((concept) => {
      return { id: concept.id, name: concept.name };
    }),
    conceptAttributes: attributes.map((attribute) => {
      return { concept_id: attribute.conceptId, name: attribute.name };
    }),
  };
}

/**
 * Loads workspace schema for offline prompts. Uses Supabase when online and
 * caches to sessionStorage; when offline uses the cache only.
 */
export async function fetchOfflineChatSchema(
  args: Readonly<{
    workspace: Workspace.T;
    openDatasetId?: string;
    navigatorOnLine: boolean;
  }>,
): Promise<OfflineChatSchema> {
  const cached = OfflineChatSchemaCache.read(args.workspace.id);

  if (args.navigatorOnLine) {
    try {
      const [datasetRows, concepts] = await Promise.all([
        DatasetClient.getAllDatasetsWithColumns(
          where("workspace_id", "eq", args.workspace.id),
        ),
        ConceptClient.getAll(where("workspace_id", "eq", args.workspace.id)),
      ]);
      const attributes =
        concepts.length === 0
          ? []
          : await ConceptAttributeClient.getAll(
              where("workspace_id", "eq", args.workspace.id),
            );
      const schema: OfflineChatSchema = {
        ..._mapDatasets(datasetRows),
        ..._mapConcepts(concepts, attributes),
      };
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

  return EMPTY_SCHEMA;
}

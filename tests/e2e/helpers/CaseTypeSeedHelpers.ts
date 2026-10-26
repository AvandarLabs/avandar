import { randomUUID } from "node:crypto";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

type SeedCaseTypeOverDatasetOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  caseTypeName: string;
  datasetId: string;
  /** The dataset column whose values key, and label, each record. */
  keyColumnName: string;
  /** The name of the one attribute, read from `keyColumnName`. */
  keyAttributeName: string;
  /** One record per key, named after it. */
  recordKeys: readonly string[];
};

/** A seeded case type and its two statuses' ids. */
export type SeededCaseType = {
  conceptId: string;
  statusIdsByName: { Active: string; Inactive: string };
};

async function _getWorkspaceOwnerId(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
  }>,
): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("workspaces")
    .select("owner_id")
    .eq("id", options.workspaceId)
    .single()
    .throwOnError();
  return data.owner_id;
}

async function _getDatasetColumnId(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    datasetId: string;
    columnName: string;
  }>,
): Promise<string> {
  const { data } = await options.supabaseAdminClient
    .from("dataset_columns")
    .select("id")
    .eq("dataset_id", options.datasetId)
    .eq("name", options.columnName)
    .single()
    .throwOnError();
  return data.id;
}

/**
 * Seeds a case type whose one attribute (the label and identifier) reads a
 * dataset column, with Active (the default) and Inactive statuses and one
 * record per key. It goes through `rpc_concepts__create`, the same single
 * transaction the app uses, because a case type and its default status
 * reference each other and cannot be inserted one request at a time.
 */
async function _seedCaseTypeOverDataset(
  options: Readonly<SeedCaseTypeOverDatasetOptions>,
): Promise<SeededCaseType> {
  const { supabaseAdminClient, workspaceId } = options;
  const [ownerId, datasetColumnId] = await Promise.all([
    _getWorkspaceOwnerId({ supabaseAdminClient, workspaceId }),
    _getDatasetColumnId({
      supabaseAdminClient,
      datasetId: options.datasetId,
      columnName: options.keyColumnName,
    }),
  ]);
  const conceptId = randomUUID();
  const attributeId = randomUUID();
  const statusIdsByName = { Active: randomUUID(), Inactive: randomUUID() };

  await supabaseAdminClient
    .rpc("rpc_concepts__create", {
      p_concept: {
        id: conceptId,
        workspace_id: workspaceId,
        owner_id: ownerId,
        name: options.caseTypeName,
        description: null,
        allow_manual_creation: false,
        default_status_id: statusIdsByName.Active,
      },
      p_statuses: [
        {
          id: statusIdsByName.Active,
          workspace_id: workspaceId,
          concept_id: conceptId,
          name: "Active",
          description: "Open and being worked on.",
          color: "#40c057",
          position: 0,
        },
        {
          id: statusIdsByName.Inactive,
          workspace_id: workspaceId,
          concept_id: conceptId,
          name: "Inactive",
          description: "No longer being worked on.",
          color: "#637c95",
          position: 1,
        },
      ],
      p_attributes: [
        {
          id: attributeId,
          workspace_id: workspaceId,
          concept_id: conceptId,
          name: options.keyAttributeName,
          description: null,
          data_type: "varchar",
          mapping_type: "dataset_column",
          is_label: true,
          is_identifier: true,
          is_array: false,
          allow_manual_edit: false,
        },
      ],
      p_dataset_column_mappings: [
        {
          workspace_id: workspaceId,
          concept_attribute_id: attributeId,
          value_picker_rule_type: "first",
          dataset_id: options.datasetId,
          dataset_column_id: datasetColumnId,
        },
      ],
      p_manual_entry_mappings: [],
    })
    .throwOnError();

  // Every record starts in the default status, as a synced record does.
  await supabaseAdminClient
    .from("individuals")
    .insert(
      options.recordKeys.map((key) => {
        return {
          workspace_id: workspaceId,
          concept_id: conceptId,
          external_id: key,
          name: key,
          status_id: statusIdsByName.Active,
        };
      }),
    )
    .throwOnError();

  return { conceptId, statusIdsByName };
}

/** Deletes a seeded case type, which cascades to its statuses and records. */
async function _deleteCaseType(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    conceptId: string;
  }>,
): Promise<void> {
  await options.supabaseAdminClient
    .from("concepts")
    .delete()
    .eq("id", options.conceptId)
    .throwOnError();
}

/** Seeds and removes case types as E2E preconditions. */
export const CaseTypeSeedHelpers = {
  /**
   * Seeds a dataset-backed case type with Active and Inactive statuses and
   * one Active record per key.
   */
  seedCaseTypeOverDataset: _seedCaseTypeOverDataset,

  /** Deletes a seeded case type with its statuses and records. */
  deleteCaseType: _deleteCaseType,
};

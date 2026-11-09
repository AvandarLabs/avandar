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

  // Every record starts in the default status, as a synced record does. The
  // spec's cleanup only sees a case type once this function returns it, so a
  // failed insert removes the case type here instead of leaving it behind.
  try {
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
  } catch (insertError) {
    await _deleteCaseType({ supabaseAdminClient, conceptId });
    throw insertError;
  }

  return { conceptId, statusIdsByName };
}

type SeedCaseTypeWithPerMonthFieldOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  caseTypeName: string;
  datasetId: string;
  /** The dataset column whose values key, and label, each record. */
  keyColumnName: string;
  keyAttributeName: string;
  /** The column averaged per month, and the field's name. */
  valueColumnName: string;
  fieldName: string;
  /** The date column that places each row in a month. */
  dateColumnName: string;
  /** One record per key, named after it. */
  recordKeys: readonly string[];
};

/**
 * Seeds a case type whose label and identifier reads `keyColumnName`, and
 * whose second field keeps the average of `valueColumnName` per month of
 * `dateColumnName`, with Active and Inactive statuses and one Active record
 * per key.
 */
async function _seedCaseTypeWithPerMonthField(
  options: Readonly<SeedCaseTypeWithPerMonthFieldOptions>,
): Promise<SeededCaseType> {
  const { supabaseAdminClient, workspaceId, datasetId } = options;
  const [ownerId, keyColumnId, valueColumnId, dateColumnId] = await Promise.all(
    [
      _getWorkspaceOwnerId({ supabaseAdminClient, workspaceId }),
      _getDatasetColumnId({
        supabaseAdminClient,
        datasetId,
        columnName: options.keyColumnName,
      }),
      _getDatasetColumnId({
        supabaseAdminClient,
        datasetId,
        columnName: options.valueColumnName,
      }),
      _getDatasetColumnId({
        supabaseAdminClient,
        datasetId,
        columnName: options.dateColumnName,
      }),
    ],
  );
  const conceptId = randomUUID();
  const keyAttributeId = randomUUID();
  const fieldAttributeId = randomUUID();
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
          id: keyAttributeId,
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
        {
          id: fieldAttributeId,
          workspace_id: workspaceId,
          concept_id: conceptId,
          name: options.fieldName,
          description: null,
          // The type of each month's value: an average is a decimal.
          data_type: "double",
          mapping_type: "dataset_column",
          is_label: false,
          is_identifier: false,
          is_array: true,
          allow_manual_edit: false,
          bucket_grain: "month",
        },
      ],
      p_dataset_column_mappings: [
        {
          workspace_id: workspaceId,
          concept_attribute_id: keyAttributeId,
          value_picker_rule_type: "first",
          dataset_id: datasetId,
          dataset_column_id: keyColumnId,
        },
        {
          workspace_id: workspaceId,
          concept_attribute_id: fieldAttributeId,
          value_picker_rule_type: "avg",
          dataset_id: datasetId,
          dataset_column_id: valueColumnId,
          bucket_column_id: dateColumnId,
        },
      ],
      p_manual_entry_mappings: [],
    })
    .throwOnError();

  // The spec's cleanup only sees a case type once this function returns it,
  // so a failed insert removes the case type here instead of leaving it.
  try {
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
  } catch (insertError) {
    await _deleteCaseType({ supabaseAdminClient, conceptId });
    throw insertError;
  }

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

  /**
   * Seeds a dataset-backed case type with a field that keeps one average
   * per month, and one Active record per key.
   */
  seedCaseTypeWithPerMonthField: _seedCaseTypeWithPerMonthField,

  /** Deletes a seeded case type with its statuses and records. */
  deleteCaseType: _deleteCaseType,
};

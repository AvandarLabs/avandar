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

type SeedAttribute = {
  id: string;
  name: string;
  dataType: "varchar" | "double";
  /** The label and identifier. A case type has exactly one. */
  isKey: boolean;
  isArray: boolean;
  /** Set for a per-period field. */
  bucketGrain?: "month";
  valuePickerRuleType: "first" | "avg";
  datasetColumnId: string;
  /** The date column that places each row in a period. */
  bucketColumnId?: string;
};

type SeedCaseTypeOptions = {
  supabaseAdminClient: AvaSupabaseDBClient;
  workspaceId: string;
  caseTypeName: string;
  datasetId: string;
  attributes: readonly SeedAttribute[];
  recordKeys: readonly string[];
};

function _buildSeedStatuses(
  options: Readonly<{
    workspaceId: string;
    conceptId: string;
    statusIds: SeededCaseType["statusIdsByName"];
  }>,
) {
  const { workspaceId, conceptId, statusIds } = options;
  return [
    {
      id: statusIds.Active,
      workspace_id: workspaceId,
      concept_id: conceptId,
      name: "Active",
      description: "Open and being worked on.",
      color: "#40c057",
      position: 0,
    },
    {
      id: statusIds.Inactive,
      workspace_id: workspaceId,
      concept_id: conceptId,
      name: "Inactive",
      description: "No longer being worked on.",
      color: "#637c95",
      position: 1,
    },
  ];
}

function _buildSeedAttributeRow(
  options: Readonly<{
    workspaceId: string;
    conceptId: string;
    attribute: SeedAttribute;
  }>,
) {
  const { workspaceId, conceptId, attribute } = options;
  return {
    id: attribute.id,
    workspace_id: workspaceId,
    concept_id: conceptId,
    name: attribute.name,
    description: null,
    data_type: attribute.dataType,
    mapping_type: "dataset_column",
    is_label: attribute.isKey,
    is_identifier: attribute.isKey,
    is_array: attribute.isArray,
    allow_manual_edit: false,
    ...(attribute.bucketGrain === undefined
      ? {}
      : { bucket_grain: attribute.bucketGrain }),
  };
}

function _buildSeedMappingRow(
  options: Readonly<{
    workspaceId: string;
    datasetId: string;
    attribute: SeedAttribute;
  }>,
) {
  const { workspaceId, datasetId, attribute } = options;
  return {
    workspace_id: workspaceId,
    concept_attribute_id: attribute.id,
    value_picker_rule_type: attribute.valuePickerRuleType,
    dataset_id: datasetId,
    dataset_column_id: attribute.datasetColumnId,
    ...(attribute.bucketColumnId === undefined
      ? {}
      : { bucket_column_id: attribute.bucketColumnId }),
  };
}

/**
 * Inserts one record per key, every one in the default status as a synced
 * record is. The spec's cleanup only sees a case type once its seed function
 * returns it, so a failed insert removes the case type here instead of
 * leaving it behind.
 */
async function _insertSeedRecords(
  options: Readonly<{
    supabaseAdminClient: AvaSupabaseDBClient;
    workspaceId: string;
    conceptId: string;
    statusId: string;
    recordKeys: readonly string[];
  }>,
): Promise<void> {
  const { supabaseAdminClient, workspaceId, conceptId } = options;
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
            status_id: options.statusId,
          };
        }),
      )
      .throwOnError();
  } catch (insertError) {
    await _deleteCaseType({ supabaseAdminClient, conceptId });
    throw insertError;
  }
}

/**
 * Seeds a dataset-backed case type through `rpc_concepts__create`, the same
 * single transaction the app uses, because a case type and its default status
 * reference each other and cannot be inserted one request at a time. It has
 * Active (the default) and Inactive statuses and one Active record per key.
 */
async function _seedCaseType(
  options: Readonly<SeedCaseTypeOptions>,
): Promise<SeededCaseType> {
  const { supabaseAdminClient, workspaceId, datasetId, attributes } = options;
  const ownerId = await _getWorkspaceOwnerId({
    supabaseAdminClient,
    workspaceId,
  });
  const conceptId = randomUUID();
  const statusIds = { Active: randomUUID(), Inactive: randomUUID() };

  await supabaseAdminClient
    .rpc("rpc_concepts__create", {
      p_concept: {
        id: conceptId,
        workspace_id: workspaceId,
        owner_id: ownerId,
        name: options.caseTypeName,
        description: null,
        allow_manual_creation: false,
        default_status_id: statusIds.Active,
      },
      p_statuses: _buildSeedStatuses({ workspaceId, conceptId, statusIds }),
      p_attributes: attributes.map((attribute) => {
        return _buildSeedAttributeRow({ workspaceId, conceptId, attribute });
      }),
      p_dataset_column_mappings: attributes.map((attribute) => {
        return _buildSeedMappingRow({ workspaceId, datasetId, attribute });
      }),
      p_manual_entry_mappings: [],
    })
    .throwOnError();
  await _insertSeedRecords({
    supabaseAdminClient,
    workspaceId,
    conceptId,
    statusId: statusIds.Active,
    recordKeys: options.recordKeys,
  });
  return { conceptId, statusIdsByName: statusIds };
}

/**
 * Seeds a case type whose one attribute (the label and identifier) reads a
 * dataset column, with Active (the default) and Inactive statuses and one
 * record per key.
 */
async function _seedCaseTypeOverDataset(
  options: Readonly<SeedCaseTypeOverDatasetOptions>,
): Promise<SeededCaseType> {
  const { supabaseAdminClient, datasetId } = options;
  const keyColumnId = await _getDatasetColumnId({
    supabaseAdminClient,
    datasetId,
    columnName: options.keyColumnName,
  });
  return _seedCaseType({
    supabaseAdminClient,
    workspaceId: options.workspaceId,
    caseTypeName: options.caseTypeName,
    datasetId,
    recordKeys: options.recordKeys,
    attributes: [
      {
        id: randomUUID(),
        name: options.keyAttributeName,
        dataType: "varchar",
        isKey: true,
        isArray: false,
        valuePickerRuleType: "first",
        datasetColumnId: keyColumnId,
      },
    ],
  });
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
  const { supabaseAdminClient, datasetId } = options;
  const getColumnId = (columnName: string): Promise<string> => {
    return _getDatasetColumnId({ supabaseAdminClient, datasetId, columnName });
  };
  const [keyColumnId, valueColumnId, dateColumnId] = await Promise.all([
    getColumnId(options.keyColumnName),
    getColumnId(options.valueColumnName),
    getColumnId(options.dateColumnName),
  ]);
  return _seedCaseType({
    supabaseAdminClient,
    workspaceId: options.workspaceId,
    caseTypeName: options.caseTypeName,
    datasetId,
    recordKeys: options.recordKeys,
    attributes: [
      {
        id: randomUUID(),
        name: options.keyAttributeName,
        dataType: "varchar",
        isKey: true,
        isArray: false,
        valuePickerRuleType: "first",
        datasetColumnId: keyColumnId,
      },
      {
        id: randomUUID(),
        name: options.fieldName,
        // The type of each month's value: an average is a decimal.
        dataType: "double",
        isKey: false,
        isArray: true,
        bucketGrain: "month",
        valuePickerRuleType: "avg",
        datasetColumnId: valueColumnId,
        bucketColumnId: dateColumnId,
      },
    ],
  });
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

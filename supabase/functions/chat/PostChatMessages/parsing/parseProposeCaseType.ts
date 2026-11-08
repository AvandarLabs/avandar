import { parseProposedCaseStatuses } from "@sbfn/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings.ts";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import type {
  ChatCaseSourceDataset,
  ChatCaseValuePickerRuleType,
  ChatCaseValueShape,
  ChatProposedCaseAttribute,
  ChatProposedCaseType,
  ChatProposedManualEntryAttribute,
} from "$/types/chat.types.ts";
import type { DatasetColumn } from "@sbfn/chat/PostChatMessages/schema/fetchWorkspaceSchema.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** The catalog columns' ids and Ava types, as `dataset_columns` stores them. */
type CatalogColumn = Pick<DatasetColumn, "id" | "data_type">;

/** Each catalog column's Ava data type, by column id. */
type ColumnDataTypesById = Map<string, AvaDataType.T>;

function _createColumnDataTypesByIdFromColumns(
  columns: readonly CatalogColumn[],
): ColumnDataTypesById {
  return new Map(
    columns.flatMap((column) => {
      const dataType = AvaDataType.Types.find((type) => {
        return type === column.data_type;
      });
      return column.id && dataType ? [[column.id, dataType] as const] : [];
    }),
  );
}

function _asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function _asUuid(value: unknown): string | undefined {
  const text = _asTrimmedString(value);
  return text && UUID_RE.test(text) ? text : undefined;
}

/**
 * Unknown rules fall back to the default instead of failing the draft: the
 * user can correct the picker in the card, so a bad guess is not worth
 * discarding an otherwise usable attribute.
 */
function _asValuePickerRuleType(value: unknown): ChatCaseValuePickerRuleType {
  const text = _asTrimmedString(value);
  return (
    DatasetColumnMappings.ValuePickerTypes.find((rule) => {
      return rule === text;
    }) ?? ValuePickerRule.DEFAULT_RULE_TYPE
  );
}

/**
 * Anything but an explicit list keeps one value, which is the safe reading
 * of a malformed proposal: the user can still switch it in the card.
 */
function _asValueShape(value: unknown): ChatCaseValueShape {
  return value === "list" ? "list" : "single";
}

/**
 * The model's rule, unless the column's type does not allow it, in which
 * case the rule every type allows. A column the catalog does not list keeps
 * the model's rule: the client drops that attribute when it resolves columns.
 */
function _toCatalogAllowedRuleType(
  options: Readonly<{
    rawRuleType: unknown;
    columnDataType: AvaDataType.T | undefined;
  }>,
): ChatCaseValuePickerRuleType {
  const ruleType = _asValuePickerRuleType(options.rawRuleType);
  return options.columnDataType
    ? ValuePickerRule.toAllowedRuleType({
        ruleType,
        columnDataType: options.columnDataType,
      })
    : ruleType;
}

function _parseSourceDataset(raw: unknown): ChatCaseSourceDataset | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const datasetId = _asUuid(record.datasetId);
  const primaryKeyColumnId = _asUuid(record.primaryKeyColumnId);
  // A source without a join key cannot be matched to the spine, so it is
  // dropped rather than carried into a draft that would fail to build.
  if (!datasetId || !primaryKeyColumnId) {
    return undefined;
  }
  return { datasetId, primaryKeyColumnId };
}

function _parseAttribute(
  raw: unknown,
  columnDataTypesById: ReadonlyMap<string, AvaDataType.T>,
): ChatProposedCaseAttribute | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const datasetId = _asUuid(record.datasetId);
  const columnId = _asUuid(record.columnId);
  const name = _asTrimmedString(record.name);
  if (!datasetId || !columnId || !name) {
    return undefined;
  }
  const description = _asTrimmedString(record.description);
  return {
    datasetId,
    columnId,
    // Every case type has a built-in `status`, and a dataset `status` column
    // is common, so the attribute is renamed rather than dropped.
    name: ConceptStatus.toNonReservedAttributeName(name),
    isIncluded: record.isIncluded !== false,
    valueShape: _asValueShape(record.valueShape),
    valuePickerRuleType: _toCatalogAllowedRuleType({
      rawRuleType: record.valuePickerRuleType,
      columnDataType: columnDataTypesById.get(columnId),
    }),
    ...(description ? { description } : {}),
  };
}

function _parseManualEntryAttribute(
  raw: unknown,
): ChatProposedManualEntryAttribute | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const name = _asTrimmedString(record.name);
  if (!name) {
    return undefined;
  }
  const description = _asTrimmedString(record.description);
  return {
    name: ConceptStatus.toNonReservedAttributeName(name),
    isIncluded: record.isIncluded === true,
    ...(description ? { description } : {}),
  };
}

function _parseList<TParsed>(
  raw: unknown,
  parseItem: (item: unknown) => TParsed | undefined,
): TParsed[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map(parseItem).filter((item): item is TParsed => {
    return item !== undefined;
  });
}

/**
 * Keeps the first entry per dataset. A dataset listed twice would give the
 * relation builder two candidate join keys for the same source, and which one
 * won would depend on iteration order.
 */
function _dedupeSourceDatasets(
  sourceDatasets: readonly ChatCaseSourceDataset[],
): ChatCaseSourceDataset[] {
  const seenDatasetIds = new Set<string>();
  return sourceDatasets.filter((sourceDataset) => {
    if (seenDatasetIds.has(sourceDataset.datasetId)) {
      return false;
    }
    seenDatasetIds.add(sourceDataset.datasetId);
    return true;
  });
}

/**
 * The proposed dataset attributes that read a declared source. An attribute
 * naming a dataset with no join key would make the whole concept unqueryable,
 * so it is dropped here instead of surfacing later as a failed query.
 */
function _parseSourceAttributes(
  options: Readonly<{
    rawAttributes: unknown;
    sourceDatasets: readonly ChatCaseSourceDataset[];
    columnDataTypesById: ReadonlyMap<string, AvaDataType.T>;
  }>,
): ChatProposedCaseAttribute[] {
  const sourceDatasetIds = new Set(
    options.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId;
    }),
  );
  return _parseList(options.rawAttributes, (item) => {
    return _parseAttribute(item, options.columnDataTypesById);
  }).filter((attribute) => {
    return sourceDatasetIds.has(attribute.datasetId);
  });
}

/**
 * A join key matches rows to a case and the label names it, and neither can
 * be a list, so those columns keep one value whatever the model proposed.
 */
function _withKeyAndLabelColumnsSingle(
  options: Readonly<{
    attributes: readonly ChatProposedCaseAttribute[];
    sourceDatasets: readonly ChatCaseSourceDataset[];
    labelColumnId: string | undefined;
  }>,
): ChatProposedCaseAttribute[] {
  const singleColumnIds = new Set([
    ...options.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.primaryKeyColumnId;
    }),
    ...(options.labelColumnId ? [options.labelColumnId] : []),
  ]);
  return options.attributes.map((attribute) => {
    return singleColumnIds.has(attribute.columnId)
      ? { ...attribute, valueShape: "single" }
      : attribute;
  });
}

/** The tool call's arguments as a record, or undefined when not valid JSON. */
function _parseArgsRecord(
  argsJson: string | undefined,
): Record<string, unknown> | undefined {
  if (!argsJson) {
    return undefined;
  }
  try {
    return JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/**
 * Parses a `proposeCaseType` tool call into the editable draft the client
 * renders. Missing optional fields are defaulted rather than rejected so a
 * partial proposal still reaches the card, where the user can finish it.
 *
 * Attributes are held to the declared sources, and an attribute named like the
 * built-in `status` is renamed. A status set is kept only when it is valid
 * whole; otherwise the draft carries none and the client supplies the default
 * set.
 *
 * A value rule its column's catalog type does not allow becomes
 * `most_frequent`. A list field keeps its rule too, so the card can switch
 * it back to one value. A join key and the label column always keep one
 * value.
 */
export function parseProposeCaseType(
  argsJson: string | undefined,
  options: Readonly<{ columns: readonly CatalogColumn[] }>,
): ChatProposedCaseType | undefined {
  const record = _parseArgsRecord(argsJson);
  if (!record) {
    return undefined;
  }

  const name = _asTrimmedString(record.name);
  const sourceDatasets = _dedupeSourceDatasets(
    _parseList(record.sourceDatasets, _parseSourceDataset),
  );
  if (!name || sourceDatasets.length === 0) {
    return undefined;
  }

  const attributes = _parseSourceAttributes({
    rawAttributes: record.attributes,
    sourceDatasets,
    columnDataTypesById: _createColumnDataTypesByIdFromColumns(options.columns),
  });
  const labelColumnId = _asUuid(record.labelColumnId);
  const hasLabelAttribute = attributes.some((attribute) => {
    return attribute.columnId === labelColumnId;
  });
  const description = _asTrimmedString(record.description);

  return {
    name,
    allowManualCreation: record.allowManualCreation === true,
    sourceDatasets,
    attributes: _withKeyAndLabelColumnsSingle({
      attributes,
      sourceDatasets,
      labelColumnId,
    }),
    manualEntryAttributes: _parseList(
      record.manualEntryAttributes,
      _parseManualEntryAttribute,
    ),
    ...(description ? { description } : {}),
    ...(labelColumnId && hasLabelAttribute ? { labelColumnId } : {}),
    ...parseProposedCaseStatuses({
      rawStatuses: record.statuses,
      rawDefaultStatusName: record.defaultStatusName,
    }),
  };
}

/**
 * Builds the assistant prose that introduces a draft card when the model
 * returned a proposal with no prose of its own.
 */
export function caseTypeDraftIntro(caseTypeName: string): string {
  return `Here is a draft "${caseTypeName}" case type. Tweak anything below, then create it.`;
}

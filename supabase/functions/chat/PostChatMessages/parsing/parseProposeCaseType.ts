import { parseProposedCaseStatuses } from "@sbfn/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import type {
  ChatCaseSourceDataset,
  ChatCaseValuePickerRuleType,
  ChatProposedCaseAttribute,
  ChatProposedCaseType,
  ChatProposedManualEntryAttribute,
} from "$/types/chat.types.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const VALUE_PICKER_RULE_TYPES = [
  "most_frequent",
  "first",
  "sum",
  "avg",
  "count",
  "max",
  "min",
] as const;

const DEFAULT_VALUE_PICKER_RULE_TYPE: ChatCaseValuePickerRuleType =
  "most_frequent";

/**
 * A catalog column as the edge function reads it from `dataset_columns`. Its
 * Ava data type arrives as plain text.
 */
export type ProposeCaseTypeCatalogColumn = Readonly<{
  id?: string;
  data_type: string;
}>;

/** Each catalog column's Ava data type, by column id. */
type ColumnDataTypesById = ReadonlyMap<string, AvaDataType.T>;

function _getColumnDataTypesById(
  columns: readonly ProposeCaseTypeCatalogColumn[],
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
    VALUE_PICKER_RULE_TYPES.find((rule) => {
      return rule === text;
    }) ?? DEFAULT_VALUE_PICKER_RULE_TYPE
  );
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
  columnDataTypesById: ColumnDataTypesById,
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
    columnDataTypesById: ColumnDataTypesById;
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
 * `most_frequent`.
 */
export function parseProposeCaseType(
  argsJson: string | undefined,
  options: Readonly<{
    columns: readonly ProposeCaseTypeCatalogColumn[];
  }> = { columns: [] },
): ChatProposedCaseType | undefined {
  if (!argsJson) {
    return undefined;
  }
  let record: Record<string, unknown>;
  try {
    record = JSON.parse(argsJson) as Record<string, unknown>;
  } catch {
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
    columnDataTypesById: _getColumnDataTypesById(options.columns),
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
    attributes,
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

import { omit } from "@avandar/utils";
import { parseProposedCaseStatuses } from "@sbfn/chat/PostChatMessages/parsing/parseProposedCaseStatuses.ts";
import { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";
import { DatasetColumnMappings } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappings.ts";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule.ts";
import type {
  ChatCaseBucketGrain,
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

/**
 * The catalog columns' ids, datasets, and Ava types, as `dataset_columns`
 * stores them.
 */
type CatalogColumn = Pick<DatasetColumn, "id" | "dataset_id" | "data_type">;

/** A catalog column's dataset and Ava data type. */
type CatalogColumnInfo = Readonly<{
  datasetId: string;
  dataType: AvaDataType.T;
}>;

/** Each catalog column's dataset and Ava data type, by column id. */
type ColumnInfosById = ReadonlyMap<string, CatalogColumnInfo>;

function _createColumnInfosByIdFromColumns(
  columns: readonly CatalogColumn[],
): ColumnInfosById {
  return new Map(
    columns.flatMap((column) => {
      const dataType = AvaDataType.Types.find((type) => {
        return type === column.data_type;
      });
      return column.id && dataType
        ? [[column.id, { datasetId: column.dataset_id, dataType }] as const]
        : [];
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

function _asBucketGrain(value: unknown): ChatCaseBucketGrain | undefined {
  const text = _asTrimmedString(value);
  return ConceptAttribute.BUCKET_GRAINS.find((bucketGrain) => {
    return bucketGrain === text;
  });
}

/**
 * The id of a date or timestamp column of `datasetId`, when the catalog lists
 * the column as one. A column the catalog does not list is refused, unlike a
 * value column: a per-period field cannot be built without a date column, so
 * the proposal falls back to one value instead of reaching the client with a
 * column it would have to refuse.
 */
function _asCatalogBucketColumnId(
  options: Readonly<{
    rawColumnId: unknown;
    datasetId: string;
    columnInfosById: ColumnInfosById;
  }>,
): string | undefined {
  const columnId = _asUuid(options.rawColumnId);
  const column = columnId ? options.columnInfosById.get(columnId) : undefined;
  return columnId &&
    column?.datasetId === options.datasetId &&
    ConceptAttribute.isBucketDateColumnType(column.dataType)
    ? columnId
    : undefined;
}

/**
 * An attribute's shape and, for a per-period one, its period and date
 * column. A per-period proposal without a known period and a date column of
 * the same dataset falls back to one value, like an unknown rule: the user
 * can still choose a period in the card. A period sent with any other shape
 * is dropped.
 */
function _parseValueShape(
  options: Readonly<{
    record: Readonly<Record<string, unknown>>;
    datasetId: string;
    columnInfosById: ColumnInfosById;
  }>,
): Pick<
  ChatProposedCaseAttribute,
  "valueShape" | "bucketGrain" | "bucketColumnId"
> {
  const { record } = options;
  if (record.valueShape !== "bucketed_list") {
    return { valueShape: _asValueShape(record.valueShape) };
  }
  const bucketGrain = _asBucketGrain(record.bucketGrain);
  const bucketColumnId = _asCatalogBucketColumnId({
    rawColumnId: record.bucketColumnId,
    datasetId: options.datasetId,
    columnInfosById: options.columnInfosById,
  });
  return bucketGrain && bucketColumnId
    ? { valueShape: "bucketed_list", bucketGrain, bucketColumnId }
    : { valueShape: "single" };
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
  columnInfosById: ColumnInfosById,
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
    ..._parseValueShape({ record, datasetId, columnInfosById }),
    valuePickerRuleType: _toCatalogAllowedRuleType({
      rawRuleType: record.valuePickerRuleType,
      columnDataType: columnInfosById.get(columnId)?.dataType,
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
 * so it is dropped here instead of surfacing later as a failed query. A join
 * key and the label column keep one value whatever the model proposed.
 */
function _parseSourceAttributes(
  options: Readonly<{
    rawAttributes: unknown;
    sourceDatasets: readonly ChatCaseSourceDataset[];
    columnInfosById: ColumnInfosById;
    labelColumnId: string | undefined;
  }>,
): ChatProposedCaseAttribute[] {
  const sourceDatasetIds = new Set(
    options.sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId;
    }),
  );
  const sourceAttributes = _parseList(options.rawAttributes, (item) => {
    return _parseAttribute(item, options.columnInfosById);
  }).filter((attribute) => {
    return sourceDatasetIds.has(attribute.datasetId);
  });
  return _withKeyAndLabelColumnsSingle({
    attributes: sourceAttributes,
    sourceDatasets: options.sourceDatasets,
    labelColumnId: options.labelColumnId,
  });
}

/**
 * A join key matches rows to a case and the label names it, and neither can
 * be a list of either kind, so those columns keep one value, without a
 * period, whatever the model proposed.
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
      ? {
          ...omit(attribute, ["bucketGrain", "bucketColumnId"]),
          valueShape: "single",
        }
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
 * `most_frequent`. A list or per-period field keeps its rule too, so the card
 * can switch it back to one value. A per-period field needs a period and a
 * date or timestamp column of its dataset that the catalog lists, or it is
 * read as one value. A join key and the label column always keep one value.
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

  const labelColumnId = _asUuid(record.labelColumnId);
  const attributes = _parseSourceAttributes({
    rawAttributes: record.attributes,
    sourceDatasets,
    columnInfosById: _createColumnInfosByIdFromColumns(options.columns),
    labelColumnId,
  });
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

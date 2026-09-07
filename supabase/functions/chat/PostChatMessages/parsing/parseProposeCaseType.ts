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

function _parseAttribute(raw: unknown): ChatProposedCaseAttribute | undefined {
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
    name,
    isIncluded: record.isIncluded !== false,
    valuePickerRuleType: _asValuePickerRuleType(record.valuePickerRuleType),
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
    name,
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
 * Parses a `proposeCaseType` tool call into the editable draft the client
 * renders. Missing optional fields are defaulted rather than rejected so a
 * partial proposal still reaches the card, where the user can finish it.
 *
 * Attributes are held to the declared sources: an attribute naming a dataset
 * with no join key would make the whole concept unqueryable, so it is dropped
 * here instead of surfacing later as a failed query.
 */
export function parseProposeCaseType(
  argsJson: string | undefined,
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

  const sourceDatasetIds = new Set(
    sourceDatasets.map((sourceDataset) => {
      return sourceDataset.datasetId;
    }),
  );
  const attributes = _parseList(record.attributes, _parseAttribute).filter(
    (attribute) => {
      return sourceDatasetIds.has(attribute.datasetId);
    },
  );
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
  };
}

/**
 * Builds the assistant prose that introduces a draft card when the model
 * returned a proposal with no prose of its own.
 */
export function caseTypeDraftIntro(caseTypeName: string): string {
  return `Here is a draft "${caseTypeName}" case type. Tweak anything below, then create it.`;
}

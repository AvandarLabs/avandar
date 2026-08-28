import type {
  ChatCaseSourceDataset,
  ChatCreatedCaseAttribute,
  ChatCreatedCaseType,
} from "$/types/chat.types.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function _asTrimmedString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function _asUuid(value: unknown): string | undefined {
  const text = _asTrimmedString(value);
  return text && UUID_RE.test(text) ? text : undefined;
}

function _parseDatasetColumnAttribute(
  raw: Record<string, unknown>,
  name: string,
): ChatCreatedCaseAttribute | undefined {
  const datasetId = _asUuid(raw.datasetId);
  const columnId = _asUuid(raw.columnId);
  if (!datasetId || !columnId) {
    return undefined;
  }
  return {
    name,
    kind: "dataset_column",
    datasetId,
    columnId,
    ...(_asTrimmedString(raw.description)
      ? { description: _asTrimmedString(raw.description) }
      : {}),
    ...(raw.isLabel === true ? { isLabel: true } : {}),
  };
}

function _parseAttribute(raw: unknown): ChatCreatedCaseAttribute | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const name = _asTrimmedString(record.name);
  if (!name) {
    return undefined;
  }
  if (record.kind === "manual_entry") {
    return {
      name,
      kind: "manual_entry",
      ...(_asTrimmedString(record.description)
        ? { description: _asTrimmedString(record.description) }
        : {}),
    };
  }
  if (record.kind === "dataset_column") {
    return _parseDatasetColumnAttribute(record, name);
  }
  return undefined;
}

function _parseIdentity(raw: unknown): ChatCaseSourceDataset | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const datasetId = _asUuid(record.datasetId);
  const primaryKeyColumnId = _asUuid(record.primaryKeyColumnId);
  if (!datasetId || !primaryKeyColumnId) {
    return undefined;
  }
  return { datasetId, primaryKeyColumnId };
}

/** Keeps the first join key per dataset, so order does not decide. */
function _parseIdentities(raw: unknown): ChatCaseSourceDataset[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seenDatasetIds = new Set<string>();
  return raw
    .map(_parseIdentity)
    .filter((identity): identity is ChatCaseSourceDataset => {
      if (!identity || seenDatasetIds.has(identity.datasetId)) {
        return false;
      }
      seenDatasetIds.add(identity.datasetId);
      return true;
    });
}

function _parseCaseType(raw: unknown): ChatCreatedCaseType | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  const name = _asTrimmedString(record.name);
  const identities = _parseIdentities(record.identities);
  if (!name || identities.length === 0) {
    return undefined;
  }
  const datasetIds = new Set(
    identities.map((identity) => {
      return identity.datasetId;
    }),
  );
  const attributes = Array.isArray(record.attributes)
    ? record.attributes
        .map(_parseAttribute)
        .filter((attribute): attribute is ChatCreatedCaseAttribute => {
          // A dataset column with no join key cannot be matched to a case, so
          // it is dropped rather than making the whole concept unqueryable.
          return (
            attribute !== undefined &&
            (attribute.kind === "manual_entry" ||
              datasetIds.has(attribute.datasetId))
          );
        })
    : [];
  return {
    name,
    allowManualCreation: record.allowManualCreation === true,
    identities,
    attributes,
    ...(_asTrimmedString(record.description)
      ? { description: _asTrimmedString(record.description) }
      : {}),
  };
}

/** Parses a createCaseTypes tool call into case types the client can insert. */
export function parseCreateCaseTypes(
  argsJson: string | undefined,
): ChatCreatedCaseType[] | undefined {
  if (!argsJson) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(argsJson) as { cases?: unknown };
    if (!Array.isArray(parsed.cases)) {
      return undefined;
    }
    const cases = parsed.cases.map(_parseCaseType).filter((caseType) => {
      return caseType !== undefined;
    });
    return cases.length > 0 ? cases : undefined;
  } catch {
    return undefined;
  }
}

import { makeBucketMap } from "@avandar/utils";
import { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute.ts";
import { ConceptStatus } from "$/models/ontology/ConceptStatus/ConceptStatus.ts";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type {
  SqlTableAliasConcept,
  SqlTableAliasConceptAttribute,
  SqlTableAliasConceptStatus,
  SqlTableAliasDataset,
  SqlTableAliasT,
} from "$/models/chat/SqlTableAlias/SqlTableAlias.types.ts";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.ts";
import type { Concept } from "$/models/ontology/Concept/Concept.ts";

/**
 * Character cap for the model-facing schema block. Qwen2.5 tokenizes a
 * 36-character dataset UUID at 32.1 tokens (~1.12 chars/token on UUIDs);
 * English schema text is denser. `@mlc-ai/web-llm@0.2.84` has no encode
 * API, so the budget is in characters. Recheck against
 * `CompletionUsage.prompt_tokens` when adding a model.
 */
const MAX_SCHEMA_BLOCK_CHARS = 6000;

type SchemaColumn = {
  dataset_id: string;
  name: string;
  data_type: string;
};

function _sortNamedRelations<T extends { id: string }>(
  relations: readonly T[],
): T[] {
  return [...relations].sort((left, right) => {
    return left.id.localeCompare(right.id);
  });
}

function _relationTableName(
  kind: "dataset" | "concept",
  relationId: string,
): string {
  // Chat schema ids are unbranded Postgres strings; RelationRef needs
  // branded ids.
  if (kind === "dataset") {
    return RelationRef.toTableName({
      kind: "dataset",
      id: relationId as Dataset.Id,
    });
  }
  return RelationRef.toTableName({
    kind: "concept",
    id: relationId as Concept.Id,
  });
}

function _fromDatasets(
  datasets: readonly SqlTableAliasDataset[],
): SqlTableAliasT[] {
  return _sortNamedRelations(datasets).map((dataset, index) => {
    return {
      kind: "dataset",
      alias: `t${index}`,
      datasetId: dataset.id,
      name: dataset.name,
      tableName: _relationTableName("dataset", dataset.id),
    };
  });
}

function _fromConcepts(
  concepts: readonly SqlTableAliasConcept[],
): SqlTableAliasT[] {
  return _sortNamedRelations(concepts).map((concept, index) => {
    return {
      kind: "concept",
      alias: `c${index}`,
      conceptId: concept.id,
      name: concept.name,
      tableName: _relationTableName("concept", concept.id),
    };
  });
}

function _fromSchema(
  args: Readonly<{
    datasets: readonly SqlTableAliasDataset[];
    concepts?: readonly SqlTableAliasConcept[];
  }>,
): SqlTableAliasT[] {
  return [
    ..._fromDatasets(args.datasets),
    ..._fromConcepts(args.concepts ?? []),
  ];
}

function _getDatasetIdFromAlias(
  alias: string,
  aliases: readonly SqlTableAliasT[],
): string | undefined {
  const normalized = alias.replace(/^"+|"+$/g, "").trim();
  const datasetAlias = aliases.find((entry) => {
    return entry.kind === "dataset" && entry.alias === normalized;
  });
  return datasetAlias?.kind === "dataset" ? datasetAlias.datasetId : undefined;
}

function _formatAliasLine(
  entry: SqlTableAliasT,
  names: readonly string[],
): string {
  if (names.length === 0) {
    return `- ${entry.alias}: ${entry.name}`;
  }
  return `- ${entry.alias}: ${entry.name} (${names.join(", ")})`;
}

/**
 * The `status: A | B` field for one concept, in position order, or nothing
 * for a concept with no statuses. It tells the model the values `status` can
 * hold, so a filter matches a real status name.
 */
function _buildStatusFields(
  statuses: readonly SqlTableAliasConceptStatus[],
): string[] {
  if (statuses.length === 0) {
    return [];
  }
  const names = ConceptStatus.sortByPosition(statuses).map((status) => {
    return status.name;
  });
  return [`status: ${names.join(" | ")}`];
}

/**
 * How a concept field appears in the schema block: the column name SQL must
 * write, then for a per-period field its period and entry struct in square
 * brackets, then in parentheses a `list` marker (for a plain list) and, when
 * the column name differs from the field's name, `field "<name>"`.
 */
function _formatConceptAttributeName(
  attribute: SqlTableAliasConceptAttribute,
  columnName: string,
): string {
  const notes = [
    ...(attribute.is_array === true && !attribute.bucket_grain ? ["list"] : []),
    ...(columnName === attribute.name ? [] : [`field "${attribute.name}"`]),
  ];
  const marker = attribute.bucket_grain
    ? ` [per ${attribute.bucket_grain}: STRUCT(bucket DATE, value ${attribute.data_type?.toUpperCase() ?? "T"})[]]`
    : "";
  return notes.length === 0
    ? `${columnName}${marker}`
    : `${columnName}${marker} (${notes.join(", ")})`;
}

/**
 * The view column name of each field of one case type, by field id. Only
 * fields with an id get one, so a field cached without an id keeps its bare
 * name.
 */
function _getColumnNamesById(
  attributes: readonly SqlTableAliasConceptAttribute[],
): Map<string, string> {
  const identified = attributes.flatMap((attribute) => {
    return attribute.id === undefined
      ? []
      : [{ id: attribute.id as ConceptAttribute.Id, name: attribute.name }];
  });
  return new Map(
    [...ConceptAttribute.getViewColumnNames(identified)].map(
      ([attributeId, viewColumn]) => {
        return [attributeId, viewColumn.columnName];
      },
    ),
  );
}

/** Each case type's field labels for the schema block, by concept id. */
function _formatConceptAttributeNames(
  attributes: readonly SqlTableAliasConceptAttribute[],
): Map<string, string[]> {
  const attributesByConceptId = makeBucketMap(attributes, {
    key: "concept_id",
  });
  return new Map(
    [...attributesByConceptId].map(([conceptId, conceptAttributes]) => {
      const columnNamesById = _getColumnNamesById(conceptAttributes);
      return [
        conceptId,
        conceptAttributes.map((attribute) => {
          return _formatConceptAttributeName(
            attribute,
            (attribute.id === undefined
              ? undefined
              : columnNamesById.get(attribute.id)) ?? attribute.name,
          );
        }),
      ];
    }),
  );
}

const LIST_FIELD_NOTE = `- A field marked (list) holds every value one record has, as a DuckDB list, and is [] when it has none. Filter with list_contains("field", 'value'), count values with len("field"), and use UNNEST("field") for one row per value. Never compare a list with =, IN, or LIKE.`;

function _formatListFieldNote(
  conceptAttributes: readonly SqlTableAliasConceptAttribute[],
): string {
  return conceptAttributes.some((attribute) => {
    return attribute.is_array === true && !attribute.bucket_grain;
  })
    ? LIST_FIELD_NOTE
    : "";
}

const BUCKETED_FIELD_NOTE = `- A field marked [per <period>: STRUCT(bucket DATE, value T)[]] holds one entry per period that has data, oldest first. Each entry's bucket is the period's first day. A period with no data is missing, not zero. Read it with UNNEST, for example: SELECT p.entry.bucket AS period, p.entry.value FROM "c0" AS c, UNNEST(c."Temperature") AS p(entry)`;

function _formatBucketedFieldNote(
  conceptAttributes: readonly SqlTableAliasConceptAttribute[],
): string {
  return conceptAttributes.some((attribute) => {
    return Boolean(attribute.bucket_grain);
  })
    ? BUCKETED_FIELD_NOTE
    : "";
}

function _formatSchemaBlock(
  args: Readonly<{
    aliases: readonly SqlTableAliasT[];
    columns: readonly SchemaColumn[];
    conceptAttributes?: readonly SqlTableAliasConceptAttribute[];
    conceptStatuses?: readonly SqlTableAliasConceptStatus[];
  }>,
): string {
  const namesByDatasetId = makeBucketMap(args.columns, {
    key: "dataset_id",
    valueKey: "name",
  });
  const namesByConceptId = _formatConceptAttributeNames(
    args.conceptAttributes ?? [],
  );
  const statusesByConceptId = makeBucketMap(args.conceptStatuses ?? [], {
    key: "concept_id",
  });
  return args.aliases
    .map((entry) => {
      const names =
        entry.kind === "dataset"
          ? (namesByDatasetId.get(entry.datasetId) ?? [])
          : [
              ...(namesByConceptId.get(entry.conceptId) ?? []),
              ..._buildStatusFields(
                statusesByConceptId.get(entry.conceptId) ?? [],
              ),
            ];
      return _formatAliasLine(entry, names);
    })
    .join("\n");
}

function _applyToSql(sql: string, aliases: readonly SqlTableAliasT[]): string {
  const longestFirst = [...aliases].sort((left, right) => {
    return right.alias.length - left.alias.length;
  });
  return longestFirst.reduce((current, entry) => {
    const quoted = new RegExp(`"${entry.alias}"`, "g");
    const unquoted = new RegExp(`(?<![\\w])${entry.alias}(?![\\w])`, "g");
    return current
      .replace(quoted, `"${entry.tableName}"`)
      .replace(unquoted, `"${entry.tableName}"`);
  }, sql);
}

function _escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrites DuckDB table names to quoted aliases, ignoring case. A table name
 * inside a string literal is rewritten too, which is fine because the result
 * is only ever shown in prompts, never run.
 */
function _toAliasedSql(
  sql: string,
  aliases: readonly SqlTableAliasT[],
): string {
  const longestFirst = [...aliases].sort((left, right) => {
    return right.tableName.length - left.tableName.length;
  });
  return longestFirst.reduce((current, entry) => {
    const name = _escapeRegExp(entry.tableName);
    const quoted = new RegExp(`"${name}"`, "gi");
    const unquoted = new RegExp(`(?<![\\w"])${name}(?![\\w"])`, "gi");
    return current
      .replace(quoted, `"${entry.alias}"`)
      .replace(unquoted, `"${entry.alias}"`);
  }, sql);
}

/**
 * Workspace-scoped short names for model-facing SQL. Datasets are `t0`,
 * `t1`, …; concepts are `c0`, `c1`, …. DuckDB still addresses tables by
 * `RelationRef.toTableName`; these names exist only in prompts and are
 * rewritten before execution.
 */
export const SqlTableAliasModule = {
  MAX_SCHEMA_BLOCK_CHARS,
  /** Assigns `tN` by sorted dataset id. */
  fromDatasets: _fromDatasets,
  /** Assigns `cN` by sorted concept id. */
  fromConcepts: _fromConcepts,
  /** Dataset aliases followed by concept aliases. */
  fromSchema: _fromSchema,
  /** Dataset id for a `tN` alias, or undefined. */
  getDatasetIdFromAlias: _getDatasetIdFromAlias,
  /**
   * One line per alias with column or attribute names, and for a concept its
   * allowed statuses.
   */
  formatSchemaBlock: _formatSchemaBlock,
  /**
   * The prompt note that explains list SQL, or an empty string when no
   * field is a list, so a prompt only pays for it when it applies.
   */
  formatListFieldNote: _formatListFieldNote,
  /**
   * The prompt note that explains how to read a per-period field, or an
   * empty string when no field has a period, so a prompt only pays for it
   * when it applies.
   */
  formatBucketedFieldNote: _formatBucketedFieldNote,
  /** Rewrites aliases to quoted DuckDB table names. */
  applyToSql: _applyToSql,
  /** Rewrites DuckDB table names back to quoted aliases, for prompts. */
  toAliasedSql: _toAliasedSql,
};

import { makeBucketMap } from "@avandar/utils";
import { RelationRef } from "$/models/relations/RelationRef/RelationRef.ts";
import type {
  SqlTableAliasConcept,
  SqlTableAliasConceptAttribute,
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

function _formatSchemaBlock(
  args: Readonly<{
    aliases: readonly SqlTableAliasT[];
    columns: readonly SchemaColumn[];
    conceptAttributes?: readonly SqlTableAliasConceptAttribute[];
  }>,
): string {
  const namesByDatasetId = makeBucketMap(args.columns, {
    key: "dataset_id",
    valueKey: "name",
  });
  const namesByConceptId = makeBucketMap(args.conceptAttributes ?? [], {
    key: "concept_id",
    valueKey: "name",
  });
  return args.aliases
    .map((entry) => {
      const names =
        entry.kind === "dataset"
          ? (namesByDatasetId.get(entry.datasetId) ?? [])
          : (namesByConceptId.get(entry.conceptId) ?? []);
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
  /** One line per alias with column or attribute names. */
  formatSchemaBlock: _formatSchemaBlock,
  /** Rewrites aliases to quoted DuckDB table names. */
  applyToSql: _applyToSql,
};

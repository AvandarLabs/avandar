import type {
  SqlTableAliasDataset,
  SqlTableAliasT,
} from "$/models/chat/SqlTableAlias/SqlTableAlias.types.ts";

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

function _fromDatasets(
  datasets: readonly SqlTableAliasDataset[],
): readonly SqlTableAliasT[] {
  const sorted = [...datasets].sort((left, right) => {
    return left.id.localeCompare(right.id);
  });
  return sorted.map((dataset, index) => {
    return {
      alias: `t${index}`,
      datasetId: dataset.id,
      name: dataset.name,
    };
  });
}

function _getDatasetIdFromAlias(
  alias: string,
  aliases: readonly SqlTableAliasT[],
): string | undefined {
  const normalized = alias.replace(/^"+|"+$/g, "").trim();
  return aliases.find((entry) => {
    return entry.alias === normalized;
  })?.datasetId;
}

function _formatSchemaBlock(args: {
  aliases: readonly SqlTableAliasT[];
  columns: readonly SchemaColumn[];
}): string {
  const namesByDataset = new Map<string, string[]>();
  args.columns.forEach((column) => {
    const names = namesByDataset.get(column.dataset_id) ?? [];
    names.push(column.name);
    namesByDataset.set(column.dataset_id, names);
  });
  return args.aliases
    .map((entry) => {
      const names = namesByDataset.get(entry.datasetId) ?? [];
      if (names.length === 0) {
        return `- ${entry.alias}: ${entry.name}`;
      }
      return `- ${entry.alias}: ${entry.name} (${names.join(", ")})`;
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
      .replace(quoted, `"${entry.datasetId}"`)
      .replace(unquoted, `"${entry.datasetId}"`);
  }, sql);
}

/**
 * Workspace-scoped short names for model-facing SQL (`t0`, `t1`, …). DuckDB
 * still addresses tables by dataset UUID; these names exist only in prompts
 * and are rewritten before execution.
 */
export const SqlTableAliasModule = {
  MAX_SCHEMA_BLOCK_CHARS,
  fromDatasets: _fromDatasets,
  getDatasetIdFromAlias: _getDatasetIdFromAlias,
  formatSchemaBlock: _formatSchemaBlock,
  applyToSql: _applyToSql,
};

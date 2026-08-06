import { propEq } from "@utils";
import { fuzzyMatchOfflineDatasetByName } from "./fuzzyMatchOfflineDatasetByName/fuzzyMatchOfflineDatasetByName";
import { OfflineDatasetLabelMatch } from "./OfflineDatasetLabelMatch";
import type { OfflineChatSchemaDataset } from "$/types/offlineChat.types";

/** DuckDB/Postgres catalog names small models hallucinate on errors. */
export const FORBIDDEN_TABLE_NAMES = new Set([
  "pg_database",
  "pg_catalog",
  "information_schema",
  "sqlite_master",
  "duckdb_tables",
  "duckdb_columns",
  "__forbidden_table_removed__",
]);

const MIN_TABLE_REF_HEURISTIC_SCORE = 2;

function stripTableQuotes(tableRef: string): string {
  return tableRef.replace(/^"+|"+$/g, "").trim();
}

function exactDatasetMatch(
  tableRef: string,
  datasets: readonly OfflineChatSchemaDataset[],
): OfflineChatSchemaDataset | undefined {
  return datasets.find((dataset) => {
    return (
      dataset.id === tableRef ||
      dataset.name === tableRef ||
      dataset.name.toLowerCase() === tableRef.toLowerCase()
    );
  });
}

/**
 * Maps a model-chosen table string onto a workspace dataset id, or undefined
 * when the reference is forbidden or too ambiguous to remap safely.
 */
export function matchOfflineDatasetTable(args: {
  tableRef: string;
  datasets: readonly OfflineChatSchemaDataset[];
  lastUserPrompt: string;
  preferredDatasetId?: string;
}): OfflineChatSchemaDataset | undefined {
  const ref = stripTableQuotes(args.tableRef);
  if (!ref || FORBIDDEN_TABLE_NAMES.has(ref.toLowerCase())) {
    return undefined;
  }

  const exact = exactDatasetMatch(ref, args.datasets);
  if (exact) {
    return exact;
  }

  const isKnownWorkspaceTable = args.datasets.some(propEq("id", ref));
  if (args.preferredDatasetId && !isKnownWorkspaceTable) {
    const preferred = args.datasets.find(propEq("id", args.preferredDatasetId));
    if (preferred) {
      return preferred;
    }
  }

  const promptLower = args.lastUserPrompt.toLowerCase();

  const promptTokens = OfflineDatasetLabelMatch.tokenize(
    `${promptLower} ${ref.toLowerCase()}`,
  );
  const { dataset: best, score: bestScore } = args.datasets.reduce<{
    dataset?: OfflineChatSchemaDataset;
    score: number;
  }>(
    (bestMatch, dataset) => {
      const score = OfflineDatasetLabelMatch.score({
        datasetName: dataset.name,
        promptTokens,
      });
      return score > bestMatch.score ? { dataset, score } : bestMatch;
    },
    { score: -1 },
  );

  if (best && bestScore >= MIN_TABLE_REF_HEURISTIC_SCORE) {
    return best;
  }

  const fuzzyMatch = fuzzyMatchOfflineDatasetByName({
    searchText: ref,
    datasets: args.datasets,
  });
  if (fuzzyMatch) {
    return fuzzyMatch;
  }

  if (args.preferredDatasetId) {
    return args.datasets.find(propEq("id", args.preferredDatasetId));
  }

  return undefined;
}

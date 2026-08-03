import { fuseMatchOfflineDatasetByName } from "./fuseMatchOfflineDataset";
import {
  scoreDatasetLabelMatch,
  tokenizeForDatasetMatch,
} from "./offlineDatasetLabelMatch";
import type { OfflineChatSchemaDataset } from "./offlineChat.types";

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

  const isKnownWorkspaceTable = args.datasets.some((dataset) => {
    return dataset.id === ref;
  });
  if (args.preferredDatasetId && !isKnownWorkspaceTable) {
    const preferred = args.datasets.find((dataset) => {
      return dataset.id === args.preferredDatasetId;
    });
    if (preferred) {
      return preferred;
    }
  }

  const promptLower = args.lastUserPrompt.toLowerCase();

  let best: OfflineChatSchemaDataset | undefined;
  let bestScore = -1;
  for (const dataset of args.datasets) {
    const score = scoreDatasetLabelMatch({
      datasetName: dataset.name,
      promptTokens: tokenizeForDatasetMatch(
        `${promptLower} ${ref.toLowerCase()}`,
      ),
    });
    if (score > bestScore) {
      best = dataset;
      bestScore = score;
    }
  }

  if (best && bestScore >= MIN_TABLE_REF_HEURISTIC_SCORE) {
    return best;
  }

  const fuseMatch = fuseMatchOfflineDatasetByName({
    searchText: ref,
    datasets: args.datasets,
  });
  if (fuseMatch) {
    return fuseMatch;
  }

  if (args.preferredDatasetId) {
    return args.datasets.find((dataset) => {
      return dataset.id === args.preferredDatasetId;
    });
  }

  return undefined;
}

import { propEq } from "@utils";
import { fuzzyMatchOfflineDatasetByName } from "@/components/ChatPanel/offlineChatHelpers/fuzzyMatchOfflineDatasetByName/fuzzyMatchOfflineDatasetByName";
import { matchOfflineDatasetTable } from "@/components/ChatPanel/offlineChatHelpers/matchOfflineDatasetTable";
import { OfflineDatasetLabelMatch } from "@/components/ChatPanel/offlineChatHelpers/OfflineDatasetLabelMatch";
import type {
  OfflineChatSchema,
  OfflineChatSchemaDataset,
} from "$/types/offlineChat.types";

/** Minimum score to prefer label match over fuzzy or open-dataset fallbacks. */
const MIN_LABEL_MATCH_SCORE = 2;

/**
 * Picks the workspace dataset that best matches the user question. Tries exact
 * and token heuristics first, then a fuzzy match of the dataset names
 * against the prompt text, then falls back to the currently open dataset.
 */
export function resolveOfflineDataset(args: {
  schema: OfflineChatSchema;
  lastUserPrompt: string;
  openDatasetId?: string;
  /** When analyze JSON includes a valid table name, it wins. */
  analyzeTableName?: string;
}): OfflineChatSchemaDataset | undefined {
  const analyzeRef = args.analyzeTableName?.trim();
  if (analyzeRef) {
    const fromAnalyzeId = args.schema.datasets.find(propEq("id", analyzeRef));
    if (fromAnalyzeId) {
      return fromAnalyzeId;
    }
    const fromAnalyzeName = matchOfflineDatasetTable({
      tableRef: analyzeRef,
      datasets: args.schema.datasets,
      lastUserPrompt: args.lastUserPrompt,
      preferredDatasetId: args.openDatasetId,
    });
    if (fromAnalyzeName) {
      return fromAnalyzeName;
    }
  }

  if (args.schema.datasets.length === 0) {
    return undefined;
  }

  if (args.schema.datasets.length === 1) {
    return args.schema.datasets[0];
  }

  const promptLower = args.lastUserPrompt.toLowerCase();
  const promptTokens = OfflineDatasetLabelMatch.tokenize(promptLower);

  const { dataset: best, score: bestScore } = args.schema.datasets.reduce<{
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

  if (best && bestScore >= MIN_LABEL_MATCH_SCORE) {
    return best;
  }

  const fuzzyFromPrompt = fuzzyMatchOfflineDatasetByName({
    searchText: args.lastUserPrompt,
    datasets: args.schema.datasets,
  });
  if (fuzzyFromPrompt) {
    return fuzzyFromPrompt;
  }

  if (analyzeRef) {
    const fuzzyFromAnalyze = fuzzyMatchOfflineDatasetByName({
      searchText: analyzeRef,
      datasets: args.schema.datasets,
    });
    if (fuzzyFromAnalyze) {
      return fuzzyFromAnalyze;
    }
  }

  if (args.openDatasetId) {
    const open = args.schema.datasets.find(propEq("id", args.openDatasetId));
    if (open) {
      return open;
    }
  }

  if (best && bestScore > 0) {
    return best;
  }

  return undefined;
}

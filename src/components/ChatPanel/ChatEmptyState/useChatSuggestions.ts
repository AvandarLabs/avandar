import { useLingui } from "@lingui/react/macro";
import { isDefined } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { ChatSuggestionColumnPicker } from "./ChatSuggestionColumnPicker/ChatSuggestionColumnPicker";
import { getCachedDatasetColumnSummaries } from "./getCachedDatasetColumnSummaries";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { QueryClient } from "@tanstack/react-query";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

type SuggestionTarget = Pick<Dataset.T, "name"> & {
  datasetId: Dataset.Id;
};

type TranslationFunction = ReturnType<typeof useLingui>["t"];

function _buildDashboardSuggestions(
  parameters: Readonly<{
    cachedSummaries: ReadonlyMap<string, ColumnSummary>;
    columns: readonly DatasetColumn.T[];
    datasetName: string;
    t: TranslationFunction;
  }>,
): string[] {
  const { cachedSummaries, columns, datasetName, t } = parameters;
  const groupByColumn = ChatSuggestionColumnPicker.pickGroupByColumn(
    columns,
    cachedSummaries,
  );
  return [
    groupByColumn ?
      t`Add a bar chart of ${datasetName} grouped by ${groupByColumn}`
    : t`Add a bar chart of row counts in ${datasetName}`,
    t`Add a line chart showing trends in ${datasetName} over time`,
    t`Add a table of the top 10 rows of ${datasetName}`,
  ];
}

function _buildDataExplorerSuggestions(
  parameters: Readonly<{
    cachedSummaries: ReadonlyMap<string, ColumnSummary>;
    columns: readonly DatasetColumn.T[];
    datasetName: string;
    t: TranslationFunction;
  }>,
): string[] {
  const { cachedSummaries, columns, datasetName, t } = parameters;
  const groupByColumn = ChatSuggestionColumnPicker.pickGroupByColumn(
    columns,
    cachedSummaries,
  );
  const averageColumn = ChatSuggestionColumnPicker.pickAverageColumn(columns);
  const secondGroupByColumn =
    !averageColumn && groupByColumn ?
      ChatSuggestionColumnPicker.pickGroupByColumn(columns, cachedSummaries, {
        excludeColumnNames: [groupByColumn],
      })
    : undefined;

  return [
    t`Show the first 20 rows of ${datasetName}`,
    groupByColumn ?
      t`Count rows in ${datasetName} by ${groupByColumn}`
    : t`Count how many rows there are in ${datasetName}`,
    averageColumn ? t`What is the average ${averageColumn} in ${datasetName}?`
    : secondGroupByColumn ?
      t`Count rows in ${datasetName} by ${secondGroupByColumn}`
    : groupByColumn ?
      t`What are the distinct values of ${groupByColumn} in ${datasetName}?`
    : undefined,
  ].filter(isDefined);
}

/** Builds starter prompts for the active chat application and dataset. */
export function useChatSuggestions(
  parameters: Readonly<{
    app: ChatPageContext.ChatApp;
    columns: readonly DatasetColumn.T[] | undefined;
    queryClient: QueryClient;
    suggestionTarget: SuggestionTarget | undefined;
    workspaceId: Workspace.Id;
  }>,
): string[] {
  const {
    app,
    columns = [],
    queryClient,
    suggestionTarget,
    workspaceId,
  } = parameters;
  const { t } = useLingui();

  return useMemo(
    function buildChatSuggestions() {
      const datasetName = suggestionTarget?.name ?? t`your dataset`;
      const cachedSummaries =
        suggestionTarget ?
          getCachedDatasetColumnSummaries({
            queryClient,
            datasetId: suggestionTarget.datasetId,
            workspaceId,
            columns,
          })
        : new Map<string, ColumnSummary>();
      const sharedParameters = { cachedSummaries, columns, datasetName, t };

      return match(app)
        .with("dashboards", () => {
          return _buildDashboardSuggestions(sharedParameters);
        })
        .with("data-explorer", () => {
          return _buildDataExplorerSuggestions(sharedParameters);
        })
        .with("data-sources", "other", () => {
          return [];
        })
        .exhaustive();
    },
    [app, columns, queryClient, suggestionTarget, t, workspaceId],
  );
}

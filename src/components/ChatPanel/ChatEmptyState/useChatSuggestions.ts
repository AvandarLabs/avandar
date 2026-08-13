import { isDefined } from "@avandar/utils";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { ChatSuggestionColumnPicker } from "./ChatSuggestionColumnPicker/ChatSuggestionColumnPicker";
import { getCachedDatasetColumnSummaries } from "./getCachedDatasetColumnSummaries";
import type { ColumnSummary } from "@/clients/datasets/DatasetQueryClient";
import type { I18n } from "@lingui/core";
import type { QueryClient } from "@tanstack/react-query";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Workspace } from "$/models/Workspace/Workspace";

type SuggestionTarget = Pick<Dataset.T, "name"> & {
  datasetId: Dataset.Id;
};

function _buildDashboardSuggestions(
  parameters: Readonly<{
    cachedSummaries: ReadonlyMap<string, ColumnSummary>;
    columns: readonly DatasetColumn.T[];
    datasetName: string;
    i18n: I18n;
  }>,
): string[] {
  const { cachedSummaries, columns, datasetName, i18n } = parameters;
  const groupByColumn = ChatSuggestionColumnPicker.pickGroupByColumn(
    columns,
    cachedSummaries,
  );
  return [
    groupByColumn ?
      i18n._(msg`Add a bar chart of ${datasetName} grouped by ${groupByColumn}`)
    : i18n._(msg`Add a bar chart of row counts in ${datasetName}`),
    i18n._(msg`Add a line chart showing trends in ${datasetName} over time`),
    i18n._(msg`Add a table of the top 10 rows of ${datasetName}`),
  ];
}

function _buildDataExplorerSuggestions(
  parameters: Readonly<{
    cachedSummaries: ReadonlyMap<string, ColumnSummary>;
    columns: readonly DatasetColumn.T[];
    datasetName: string;
    i18n: I18n;
  }>,
): string[] {
  const { cachedSummaries, columns, datasetName, i18n } = parameters;
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
    i18n._(msg`Show the first 20 rows of ${datasetName}`),
    groupByColumn ?
      i18n._(msg`Count rows in ${datasetName} by ${groupByColumn}`)
    : i18n._(msg`Count how many rows there are in ${datasetName}`),
    averageColumn ?
      i18n._(msg`What is the average ${averageColumn} in ${datasetName}?`)
    : secondGroupByColumn ?
      i18n._(msg`Count rows in ${datasetName} by ${secondGroupByColumn}`)
    : groupByColumn ?
      i18n._(
        msg`What are the distinct values of ${groupByColumn} in ${datasetName}?`,
      )
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
  const { t, i18n } = useLingui();

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
      const sharedParameters = { cachedSummaries, columns, datasetName, i18n };

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
    [app, columns, i18n, queryClient, suggestionTarget, t, workspaceId],
  );
}

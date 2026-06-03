import { useThreadRuntime } from "@assistant-ui/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { Link, TruncatedText } from "@ui";
import { where } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { getCachedDatasetColumnSummaries } from "@/components/ChatPanel/ChatEmptyState/getCachedDatasetColumnSummaries";
import {
  pickAverageColumn,
  pickGroupByColumn,
} from "@/components/ChatPanel/ChatEmptyState/pickChatSuggestionColumns";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import css from "./ChatEmptyState.module.css";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

/**
 * Returns the localized label for the page chip shown in the empty state.
 */
function usePageLabel(app: ChatPageContext.ChatApp): string {
  const { t } = useLingui();
  return match(app)
    .with("data-explorer", () => {
      return t`Data Explorer`;
    })
    .with("data-sources", () => {
      return t`Data Sources`;
    })
    .with("dashboards", () => {
      return t`Dashboards`;
    })
    .with("other", () => {
      return t`Avandar`;
    })
    .exhaustive();
}

function _pickRandomDataset(
  datasets: readonly Dataset.T[],
): Dataset.T | undefined {
  if (datasets.length === 0) {
    return undefined;
  }
  const index = Math.floor(Math.random() * datasets.length);
  return datasets[index];
}

/**
 * Empty-state shown above the composer when the thread has no messages yet.
 * Shows the current page context as a chip and, for Data Explorer, three
 * starter prompts the user can click to send.
 */
export function ChatEmptyState(): JSX.Element {
  const context = useChatPageContext();
  const workspace = useCurrentWorkspace();
  const queryClient = useQueryClient();
  const { openDataset } = DataExplorerStateManager.useState();
  const threadRuntime = useThreadRuntime();
  const { t } = useLingui();
  const pageLabel = usePageLabel(context.app);
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const suggestionTarget = useMemo(() => {
    const availableDatasets = datasets ?? [];
    const randomDataset = _pickRandomDataset(availableDatasets);
    if (openDataset) {
      return { datasetId: openDataset.datasetId, name: openDataset.name };
    }
    if (randomDataset) {
      return { datasetId: randomDataset.id, name: randomDataset.name };
    }
    return undefined;
  }, [datasets, openDataset]);

  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", suggestionTarget?.datasetId),
    useQueryOptions: {
      enabled: suggestionTarget !== undefined,
    },
  });

  const suggestions = useMemo(() => {
    const fallbackTarget = t`your dataset`;
    const datasetName = suggestionTarget?.name ?? fallbackTarget;
    const columns = datasetColumns ?? [];
    const cachedSummaries =
      suggestionTarget ?
        getCachedDatasetColumnSummaries({
          queryClient,
          datasetId: suggestionTarget.datasetId,
          workspaceId: workspace.id,
          columns,
        })
      : new Map();

    if (context.app === "dashboards") {
      const groupByColumn = pickGroupByColumn(columns, cachedSummaries);
      return [
        groupByColumn ?
          t`Add a bar chart of ${datasetName} grouped by ${groupByColumn}`
        : t`Add a bar chart of row counts in ${datasetName}`,
        t`Add a line chart showing trends in ${datasetName} over time`,
        t`Add a table of the top 10 rows of ${datasetName}`,
      ];
    }
    if (context.app !== "data-explorer") {
      return [];
    }

    const pickedGroupBy = pickGroupByColumn(columns, cachedSummaries);
    const averageColumn = pickAverageColumn(columns);

    const prompts = [t`Show the first 20 rows of ${datasetName}`];

    if (pickedGroupBy) {
      prompts.push(t`Count rows in ${datasetName} by ${pickedGroupBy}`);
    } else {
      prompts.push(t`Count how many rows there are in ${datasetName}`);
    }

    if (averageColumn) {
      prompts.push(t`What is the average ${averageColumn} in ${datasetName}?`);
    } else if (pickedGroupBy) {
      const secondGroupBy = pickGroupByColumn(columns, cachedSummaries, {
        excludeColumnNames: [pickedGroupBy],
      });
      if (secondGroupBy) {
        prompts.push(t`Count rows in ${datasetName} by ${secondGroupBy}`);
      } else {
        prompts.push(
          t`What are the distinct values of ${pickedGroupBy} in ${datasetName}?`,
        );
      }
    }

    return prompts;
  }, [
    context.app,
    datasetColumns,
    queryClient,
    suggestionTarget,
    t,
    workspace.id,
  ]);

  const sendPrompt = (text: string) => {
    threadRuntime?.append({
      role: "user",
      content: [{ type: "text", text }],
    });
  };

  const dataExplorerLink = AppLinks.dataExplorer(workspace.slug);

  return (
    <Stack gap="md" p="md">
      <Group gap="xs">
        <Badge variant="light" color="primary" radius="sm">
          {pageLabel}
        </Badge>
      </Group>
      <Stack gap={4}>
        <Text size="md" fw={600} c="neutral.9">
          {context.app === "dashboards" ?
            <Trans>Build a chart in chat</Trans>
          : <Trans>Ask about your data</Trans>}
        </Text>
        <Text size="sm" c="neutral.6" lh={1.5}>
          {context.app === "data-explorer" ?
            <Trans>
              Type a question and I will generate the SQL and run it on the
              canvas.
            </Trans>
          : context.app === "dashboards" ?
            <Trans>
              Ask me to add a chart to this dashboard. I will pick a viz type,
              write the SQL, and drop a block onto the page.
            </Trans>
          : <Trans>
              Chat is enabled in the Data Explorer and Dashboards.{" "}
              <Link
                to={dataExplorerLink.to}
                params={dataExplorerLink.params}
                c="primary"
                td="underline"
                fz="inherit"
                lh="inherit"
              >
                Open Data Explorer
              </Link>
              .
            </Trans>
          }
        </Text>
      </Stack>
      {suggestions.length > 0 ?
        <Stack gap="xxs" mt="xs">
          <Text size="xs" c="neutral.6" tt="uppercase" fw={600}>
            <Trans>Try one of these</Trans>
          </Text>
          {suggestions.map((prompt, index) => {
            return (
              <Button
                key={`suggestion-${index}`}
                variant="default"
                size="xs"
                justify="flex-start"
                fullWidth
                onClick={() => {
                  sendPrompt(prompt);
                }}
                classNames={{
                  root: css.suggestionButton,
                  inner: css.suggestionButtonInner,
                  label: css.suggestionButtonLabel,
                }}
              >
                <TruncatedText withFullTextTooltip maw="100%" size="xs">
                  {prompt}
                </TruncatedText>
              </Button>
            );
          })}
        </Stack>
      : null}
    </Stack>
  );
}

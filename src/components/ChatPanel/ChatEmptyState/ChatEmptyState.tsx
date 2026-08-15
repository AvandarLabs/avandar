import { useThreadRuntime } from "@assistant-ui/react";
import { Link, TruncatedText } from "@avandar/ui";
import { getRandomItem, matchLiteral, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useChatSuggestions } from "@/components/ChatPanel/ChatEmptyState/useChatSuggestions";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import css from "./ChatEmptyState.module.css";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

/**
 * Returns the localized label for the page chip shown in the empty state.
 */
function usePageLabel(app: ChatPageContext.ChatApp): string {
  const { t } = useLingui();
  return matchLiteral(app, {
    "data-explorer": t`Data Explorer`,
    "data-sources": t`Data Sources`,
    dashboards: t`Dashboards`,
    other: t`Avandar`,
  });
}

/**
 * Empty-state shown above the composer when the thread has no messages yet.
 * Shows the current page context as a chip and, for Data Explorer, three
 * starter prompts the user can click to send.
 */
export function ChatEmptyState(): React.ReactNode {
  const context = useChatPageContext();
  const workspace = useCurrentWorkspace();
  const queryClient = useQueryClient();
  const { openDataset } = DataExplorerStateManager.useState();
  const threadRuntime = useThreadRuntime();
  const pageLabel = usePageLabel(context.app);
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const suggestionTarget = useMemo(() => {
    const availableDatasets = datasets ?? [];
    const randomDataset = getRandomItem(availableDatasets);
    return (
      openDataset ? { datasetId: openDataset.datasetId, name: openDataset.name }
      : randomDataset ?
        { datasetId: randomDataset.id, name: randomDataset.name }
      : undefined
    );
  }, [datasets, openDataset]);

  const [datasetColumns] = DatasetColumnClient.useGetAll({
    ...where("dataset_id", "eq", suggestionTarget?.datasetId),
    useQueryOptions: {
      enabled: suggestionTarget !== undefined,
    },
  });

  const suggestions = useChatSuggestions({
    app: context.app,
    columns: datasetColumns,
    queryClient,
    suggestionTarget,
    workspaceId: workspace.id,
  });

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
          {suggestions.map((prompt) => {
            return (
              <Button
                key={prompt}
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

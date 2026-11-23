import { useThreadRuntime } from "@assistant-ui/react";
import { Link } from "@avandar/ui";
import { getRandomItem, matchLiteral, where } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Stack, Text, Title, UnstyledButton } from "@mantine/core";
import { IconArrowUpRight } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { DatasetClient } from "@/clients/datasets/DatasetClient/DatasetClient";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { useChatSuggestions } from "@/components/ChatPanel/ChatEmptyState/useChatSuggestions";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataAgentFeature } from "@/lib/agent/dataAgent/browser/DataAgentFeature";
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
    "case-manager": t`Case Manager`,
    other: t`Avandar`,
  });
}

/**
 * Empty-state shown above the composer when the thread has no messages yet.
 * Sits at the foot of the thread, next to the composer where the eye already
 * is, and shows the current page context as a chip and, for Data Explorer,
 * three starter prompts the user can click to send. On a page without its own
 * copy, it says chat works only in Data Explorer and Dashboards, unless the
 * data agent is on, where chat works there too.
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
    return openDataset
      ? { datasetId: openDataset.datasetId, name: openDataset.name }
      : randomDataset
        ? { datasetId: randomDataset.id, name: randomDataset.name }
        : undefined;
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
    <Stack gap="md" className={css.chatEmptyState}>
      <Stack gap="xs" align="flex-start">
        <Badge
          variant="light"
          color="neutral"
          radius="sm"
          size="sm"
          tt="none"
          fw={500}
        >
          {pageLabel}
        </Badge>
        <Title order={3} size="lg" fw={650} c="neutral.9" lh={1.3}>
          {context.app === "dashboards" ? (
            <Trans>Build a chart in chat</Trans>
          ) : context.app === "case-manager" ? (
            <Trans>Design case types in chat</Trans>
          ) : (
            <Trans>Ask about your data</Trans>
          )}
        </Title>
        <Text size="sm" c="neutral.6" lh={1.55}>
          {context.app === "data-explorer" ? (
            <Trans>
              Type a question and I will generate the SQL and run it for you.
            </Trans>
          ) : context.app === "dashboards" ? (
            <Trans>
              Ask me to add a chart to this dashboard. I will pick a viz type,
              write the SQL, and drop a block onto the page.
            </Trans>
          ) : context.app === "case-manager" ? (
            <Trans>
              I will propose case types from your dataset names and columns.
              Pick from the options or tell me what to create.
            </Trans>
          ) : DataAgentFeature.isEnabled() ? (
            <Trans>
              Ask a question about your data. Type @ to point me at a dashboard,
              dataset, or map.
            </Trans>
          ) : (
            <Trans>
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
          )}
        </Text>
      </Stack>
      {suggestions.length > 0 ? (
        <Stack gap="xxs">
          <Text size="xs" c="neutral.6" fw={500}>
            <Trans>Try asking</Trans>
          </Text>
          <ul className={css.suggestionList}>
            {suggestions.map((prompt) => {
              return (
                <li key={prompt}>
                  <UnstyledButton
                    className={css.suggestionButton}
                    onClick={() => {
                      sendPrompt(prompt);
                    }}
                  >
                    <Text span size="sm" c="neutral.8" lh={1.45} lineClamp={2}>
                      {prompt}
                    </Text>
                    <IconArrowUpRight
                      size={14}
                      aria-hidden
                      className={css.suggestionButtonIcon}
                    />
                  </UnstyledButton>
                </li>
              );
            })}
          </ul>
        </Stack>
      ) : null}
    </Stack>
  );
}

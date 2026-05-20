import { useThreadRuntime } from "@assistant-ui/react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { Link, TruncatedText } from "@ui";
import { where } from "@utils";
import { useMemo } from "react";
import { match } from "ts-pattern";
import { DatasetClient } from "@/clients/datasets/DatasetClient";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import css from "./ChatEmptyState.module.css";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ChatApp } from "$/types/chat.types";

/**
 * Returns the localized label for the page chip shown in the empty state.
 */
function _usePageLabel(app: ChatApp): string {
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

function _pickRandomDatasetName(
  datasets: readonly Dataset.T[],
): string | undefined {
  if (datasets.length === 0) {
    return undefined;
  }
  const index = Math.floor(Math.random() * datasets.length);
  return datasets[index]?.name;
}

/**
 * Empty-state shown above the composer when the thread has no messages yet.
 * Shows the current page context as a chip and, for Data Explorer, three
 * starter prompts the user can click to send.
 */
export function ChatEmptyState(): JSX.Element {
  const context = useChatPageContext();
  const workspace = useCurrentWorkspace();
  const { openDataset } = DataExplorerStateManager.useState();
  const threadRuntime = useThreadRuntime();
  const { t } = useLingui();
  const pageLabel = _usePageLabel(context.app);
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const suggestions = useMemo(() => {
    const availableDatasets = datasets ?? [];
    const fallbackTarget = t`your dataset`;
    if (context.app === "dashboards") {
      const target = _pickRandomDatasetName(availableDatasets) ?? fallbackTarget;
      return [
        t`Add a bar chart of ${target} grouped by category`,
        t`Add a line chart showing trends in ${target} over time`,
        t`Add a table of the top 10 rows of ${target}`,
      ];
    }
    if (context.app !== "data-explorer") {
      return [];
    }
    const promptTemplates = [
      (name: string) => {
        return t`Show the first 20 rows of ${name}`;
      },
      (name: string) => {
        return t`Count rows in ${name} by category`;
      },
      (name: string) => {
        return t`What is the average value in ${name}?`;
      },
    ];
    return promptTemplates.map((buildPrompt) => {
      const target =
        openDataset?.name ??
        _pickRandomDatasetName(availableDatasets) ??
        fallbackTarget;
      return buildPrompt(target);
    });
  }, [context.app, datasets, openDataset, t]);

  const sendPrompt = (text: string) => {
    threadRuntime.append({
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

import { useThreadRuntime } from "@assistant-ui/react";
import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { Link } from "@ui";
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

function pageLabel(app: ChatApp): string {
  return match(app)
    .with("data-explorer", () => {
      return "Data Explorer";
    })
    .with("data-sources", () => {
      return "Data Sources";
    })
    .with("dashboards", () => {
      return "Dashboards";
    })
    .with("other", () => {
      return "Avandar";
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
  const [datasets] = DatasetClient.useGetAll(
    where("workspace_id", "eq", workspace.id),
  );

  const suggestions = useMemo(() => {
    if (context.app !== "data-explorer") {
      return [];
    }
    const availableDatasets = datasets ?? [];
    const promptTemplates = [
      (name: string) => {
        return `Show the first 20 rows of ${name}`;
      },
      (name: string) => {
        return `Count rows in ${name} by category`;
      },
      (name: string) => {
        return `What is the average value in ${name}?`;
      },
    ];
    return promptTemplates.map((buildPrompt) => {
      const target =
        openDataset?.name ??
        _pickRandomDatasetName(availableDatasets) ??
        "your dataset";
      return buildPrompt(target);
    });
  }, [context.app, datasets, openDataset]);

  const send = (text: string) => {
    threadRuntime.append({
      role: "user",
      content: [{ type: "text", text }],
    });
  };

  const dataExplorerLink = AppLinks.dataExplorer(workspace.slug);

  return (
    <Stack gap="md" p="md">
      <Group gap="xs">
        <Badge
          variant="light"
          color="primary"
          radius="sm"
          leftSection={<IconSparkles size={12} />}
        >
          {pageLabel(context.app)}
        </Badge>
      </Group>
      <Stack gap={4}>
        <Text size="md" fw={600} c="neutral.9">
          Ask about your data
        </Text>
        <Text size="sm" c="neutral.6" lh={1.5}>
          {context.app === "data-explorer" ?
            "Type a question and I will generate the SQL and run it on the canvas."
          : <>
              Chat is only enabled for the Data Explorer app for now.{" "}
              <Link
                to={dataExplorerLink.to}
                params={dataExplorerLink.params}
                c="primary"
                td="underline"
                fz="inherit"
                lh="inherit"
              >
                Switch over to ask a data question
              </Link>
              .
            </>
          }
        </Text>
      </Stack>
      {suggestions.length > 0 ?
        <Stack gap="xxs" mt="xs">
          <Text size="xs" c="neutral.6" tt="uppercase" fw={600}>
            Try one of these
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
                  send(prompt);
                }}
                classNames={{
                  root: css.suggestionButton,
                  inner: css.suggestionButtonInner,
                  label: css.suggestionButtonLabel,
                }}
              >
                {prompt}
              </Button>
            );
          })}
        </Stack>
      : null}
    </Stack>
  );
}

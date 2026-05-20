import { Trans } from "@lingui/react/macro";
import {
  Code,
  Group,
  Popover,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import css from "./GeneratedPromptBadge.module.css";

/**
 * Thin attribution bar that sits between the Data Explorer toolbar and the
 * visualization. When the current SQL came from a natural-language prompt
 * (the chat panel or the legacy AI query tab), it shows the prompt with a
 * "Show SQL" popover so the user always sees the link between what they
 * asked and what is on the canvas. Renders nothing when no prompt is set.
 */
export function GeneratedPromptBadge(): JSX.Element | null {
  const { nlPrompt, rawSQL } = DataExplorerStateManager.useState();

  if (!nlPrompt) {
    return null;
  }

  return (
    <Group
      bg="primary.0"
      px="md"
      py="xxs"
      gap="xs"
      wrap="nowrap"
      className={css.root}
    >
      <IconSparkles
        size={14}
        color="var(--mantine-color-primary-7)"
        className={css.icon}
      />
      <Text size="xs" c="primary.9" fw={600} className={css.staticText}>
        <Trans>From your prompt:</Trans>
      </Text>
      <Text
        size="xs"
        c="neutral.8"
        truncate
        className={css.promptText}
        title={nlPrompt}
      >
        {nlPrompt}
      </Text>
      {rawSQL ?
        <Popover position="bottom-end" withArrow shadow="md" width={420}>
          <Popover.Target>
            <UnstyledButton c="primary.7" className={css.showSqlButton}>
              <Trans>Show SQL</Trans>
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown p="sm">
            <Stack gap="xs">
              <Text size="xs" c="neutral.6" fw={600} tt="uppercase">
                <Trans>Generated SQL</Trans>
              </Text>
              <ScrollArea.Autosize mah={280}>
                <Code block fz="xs">
                  {rawSQL}
                </Code>
              </ScrollArea.Autosize>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      : null}
    </Group>
  );
}

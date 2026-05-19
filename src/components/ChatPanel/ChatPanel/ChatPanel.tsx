import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { ActionIcon, Box, Group, Stack, Text } from "@mantine/core";
import { IconSparkles, IconX } from "@tabler/icons-react";
import { Tooltip } from "@ui";
import clsx from "clsx";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatThread } from "@/components/ChatPanel/ChatThread/ChatThread";
import { useAvandarChatRuntime } from "@/components/ChatPanel/useAvandarChatRuntime";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import css from "./ChatPanel.module.css";

/**
 * The right-side chat panel ("Ask Avandar") rendered inside the AppShell's
 * Aside slot. Owns the Assistant UI runtime and renders the thread + composer.
 * When the user asks a data question on the Data Explorer page, the runtime
 * pushes the generated SQL to `DataExplorerStateManager` so the canvas
 * re-runs automatically.
 */
export function ChatPanel(): JSX.Element {
  const dispatch = ChatPanelStateManager.useDispatch();
  const runtime = useAvandarChatRuntime();
  const context = useChatPageContext();
  const disabled = context.app !== "data-explorer" && context.app !== "dashboards";

  return (
    <Box h="100%" py="xs" pr="xs">
      <Stack
        h="100%"
        bdrs="md"
        className={clsx(css.shell, disabled && css.shellDisabled)}
        gap={0}
      >
        <Group px="md" py="sm" justify="space-between" className={css.header}>
          <Group gap="xs">
            <IconSparkles size={16} color="var(--mantine-color-primary-6)" />
            <Text size="sm" fw={600} c="neutral.9">
              Ask Avandar
            </Text>
          </Group>
          <Tooltip label="Close panel (⌘/)">
            <ActionIcon
              variant="subtle"
              size="sm"
              color="neutral"
              onClick={dispatch.close}
              aria-label="Close chat panel"
            >
              <IconX size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <AssistantRuntimeProvider runtime={runtime}>
          <ChatThread />
        </AssistantRuntimeProvider>
      </Stack>
    </Box>
  );
}

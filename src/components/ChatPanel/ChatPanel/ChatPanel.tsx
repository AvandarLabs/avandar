import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Box, Stack } from "@mantine/core";
import clsx from "clsx";
import { ChatPanelHeader } from "@/components/ChatPanel/ChatPanelHeader/ChatPanelHeader";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ChatThread } from "@/components/ChatPanel/ChatThread/ChatThread";
import { useAvandarChatRuntime } from "@/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { ChatViewTranscriptSync } from "@/components/ChatPanel/useChatViewTranscript/ChatViewTranscriptSync";
import css from "./ChatPanel.module.css";

/**
 * The right-side chat panel ("Ask Avandar") rendered inside the AppShell's
 * Aside slot. Owns the Assistant UI runtime and renders the thread + composer.
 * When the user asks a data question on the Data Explorer page, the runtime
 * pushes the generated SQL to `DataExplorerStateManager` so the canvas
 * re-runs automatically.
 */
export function ChatPanel(): React.ReactNode {
  const dispatch = ChatPanelStateManager.useDispatch();
  const { runtime, startNewChat } = useAvandarChatRuntime();
  const context = useChatPageContext();
  const disabled =
    context.app !== "data-explorer" && context.app !== "dashboards";

  return (
    <Box h="100%" py="xs" pr="xs">
      <Stack
        h="100%"
        bdrs="md"
        className={clsx(css.shell, disabled && css.chatPanelShellDisabled)}
        gap={0}
      >
        <ChatPanelHeader
          onNewChatClick={startNewChat}
          onClose={dispatch.close}
        />
        <AssistantRuntimeProvider runtime={runtime}>
          <ChatViewTranscriptSync />
          <ChatThread />
        </AssistantRuntimeProvider>
      </Stack>
    </Box>
  );
}

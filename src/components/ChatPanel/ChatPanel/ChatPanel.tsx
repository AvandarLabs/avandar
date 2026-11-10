import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Box, Stack } from "@mantine/core";
import clsx from "clsx";
import { ChatPanelHeader } from "@/components/ChatPanel/ChatPanelHeader/ChatPanelHeader";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { useChatSessions } from "@/components/ChatPanel/ChatSessionProvider/useChatSessions";
import { ChatThread } from "@/components/ChatPanel/ChatThread/ChatThread";
import { useAvandarChatRuntime } from "@/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime";
import { ChatViewTranscriptSync } from "@/components/ChatPanel/useChatViewTranscript/ChatViewTranscriptSync";
import { NuxOpenChatPanelEffect } from "@/components/Nux/NuxTour/useNuxOpenChatPanel/NuxOpenChatPanelEffect";
import css from "./ChatPanel.module.css";

/**
 * The right-side chat panel ("Ask Avandar") rendered inside the AppShell's
 * Aside slot. Owns the Assistant UI runtime and renders the thread + composer.
 * Case Manager composer layout overlays a wider panel on the slate; the
 * AppShell column stays docked. When the user asks a data question on the
 * Data Explorer page, the runtime pushes the generated SQL to
 * `DataExplorerStateManager` so the query re-runs automatically.
 */
export function ChatPanel(): React.ReactNode {
  const dispatch = ChatPanelStateManager.useDispatch();
  const { layout } = ChatPanelStateManager.useState();
  const { runtime } = useAvandarChatRuntime();
  const sessions = useChatSessions();
  const onNewChatClick = () => {
    sessions?.startDataSession();
  };

  return (
    <>
      <NuxOpenChatPanelEffect />
      <Box
        className={clsx(css.dock, layout === "composer" && css.dockComposer)}
        data-chat-layout={layout}
      >
        <Stack
          className={clsx(
            css.shell,
            layout === "composer" && css.shellComposer,
          )}
          gap={0}
        >
          <ChatPanelHeader
            onNewChatClick={onNewChatClick}
            onClose={dispatch.close}
          />
          <AssistantRuntimeProvider runtime={runtime}>
            <ChatViewTranscriptSync />
            <ChatThread />
          </AssistantRuntimeProvider>
        </Stack>
      </Box>
    </>
  );
}

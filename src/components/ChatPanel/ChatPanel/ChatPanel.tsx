import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Box, Stack } from "@mantine/core";
import clsx from "clsx";
import { useEffect, useRef } from "react";
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
 * Case Manager composer layout overlays a wider panel on the canvas; the
 * AppShell column stays docked. When the user asks a data question on the
 * Data Explorer page, the runtime pushes the generated SQL to
 * `DataExplorerStateManager` so the canvas re-runs automatically.
 */
export function ChatPanel(): React.ReactNode {
  const dispatch = ChatPanelStateManager.useDispatch();
  const { layout, caseDesignSessionNonce } = ChatPanelStateManager.useState();
  const { runtime, startNewChat } = useAvandarChatRuntime();
  const context = useChatPageContext();
  const handledCaseDesignNonceRef = useRef(0);
  const disabled =
    context.app !== "data-explorer" &&
    context.app !== "dashboards" &&
    context.app !== "case-manager";

  useEffect(
    function resetThreadForCaseDesignSession() {
      if (
        caseDesignSessionNonce === 0 ||
        caseDesignSessionNonce === handledCaseDesignNonceRef.current
      ) {
        return;
      }
      handledCaseDesignNonceRef.current = caseDesignSessionNonce;
      startNewChat();
    },
    [caseDesignSessionNonce, startNewChat],
  );

  useEffect(
    function collapseComposerOutsideCaseManager() {
      if (context.app !== "case-manager") {
        dispatch.collapseComposer();
      }
    },
    [context.app, dispatch],
  );

  const onNewChatClick =
    context.app === "case-manager" ? dispatch.beginCaseDesign : startNewChat;

  return (
    <Box h="100%" py="xs" pr="xs">
      <Stack
        h="100%"
        bdrs="md"
        className={clsx(
          css.shell,
          disabled && css.chatPanelShellDisabled,
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
  );
}

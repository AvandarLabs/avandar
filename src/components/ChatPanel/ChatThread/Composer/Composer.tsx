import { ComposerPrimitive } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Group } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import clsx from "clsx";
import { useRef } from "react";
import { ChatModelPicker } from "@/components/ChatPanel/ChatModelPicker/ChatModelPicker";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { OfflineChatDownloadControl } from "@/components/ChatPanel/OfflineChatDownloadControl/OfflineChatDownloadControl";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import { useChatPanelComposerAutoFocus } from "@/components/ChatPanel/useChatPanelComposerAutoFocus";
import { VoiceInputButton } from "@/components/ChatPanel/VoiceInputButton/VoiceInputButton";
import { useOfflineBlocksCloudChat } from "@/lib/offline/useOfflineBlocksCloudChat";
import { useIsVoicePromptAvailable } from "@/lib/voice/useIsVoicePromptAvailable";
import css from "./Composer.module.css";

export function Composer(): JSX.Element {
  const { isOpen } = ChatPanelStateManager.useState();
  const panelRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  useChatPanelComposerAutoFocus({
    isOpen,
    panelRef,
    composerInputRef,
  });

  const context = useChatPageContext();
  const { t } = useLingui();
  const offlineBlocksCloudChat = useOfflineBlocksCloudChat();
  const { isAvailable: isVoicePromptAvailable, isChecking: isVoiceChecking } =
    useIsVoicePromptAvailable();
  const isChatEnabled =
    context.app === "data-explorer" || context.app === "dashboards";
  const chatDisabled = !isChatEnabled || offlineBlocksCloudChat;
  const voiceDisabled =
    !isChatEnabled || (!isVoicePromptAvailable && !isVoiceChecking);

  const placeholder =
    offlineBlocksCloudChat ?
      t`Download an offline chat model (cloud icon) to ask questions while offline.`
    : context.app === "dashboards" ?
      t`Ask me to add a chart to this dashboard...`
    : context.app === "data-explorer" ? t`Ask about your data...`
    : t`Chat is enabled in Data Explorer and Dashboards`;

  return (
    <div ref={panelRef} className={css.composerContainer}>
      <ComposerPrimitive.Root
        className={clsx(css.composer, chatDisabled && css.composerDisabled)}
      >
        <ComposerPrimitive.Input
          ref={composerInputRef}
          className={css.composerInput}
          placeholder={placeholder}
          rows={1}
          autoFocus={false}
          disabled={chatDisabled}
          unstable_focusOnRunStart={false}
          unstable_focusOnScrollToBottom={false}
          unstable_focusOnThreadSwitched={false}
        />
        <Group gap="xs">
          <OfflineChatDownloadControl disabled={!isChatEnabled} />
          <VoiceInputButton disabled={voiceDisabled} />
          <ChatModelPicker disabled={chatDisabled} />
          <ComposerPrimitive.Send asChild>
            <ActionIcon
              variant="filled"
              color="primary"
              size="md"
              aria-label={t`Send message`}
              disabled={chatDisabled}
              className={css.composerSend}
            >
              <IconArrowUp size={16} />
            </ActionIcon>
          </ComposerPrimitive.Send>
        </Group>
      </ComposerPrimitive.Root>
    </div>
  );
}

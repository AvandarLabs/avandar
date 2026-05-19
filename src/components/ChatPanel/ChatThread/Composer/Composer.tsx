import { ComposerPrimitive } from "@assistant-ui/react";
import { ActionIcon } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { ChatModelPicker } from "@/components/ChatPanel/ChatModelPicker/ChatModelPicker";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import css from "../ChatThread.module.css";

export function Composer(): JSX.Element {
  const context = useChatPageContext();
  const disabled = context.app !== "data-explorer";

  return (
    <div className={css.composerContainer}>
      <ComposerPrimitive.Root className={css.composer}>
        <ChatModelPicker disabled={disabled} />
        <ComposerPrimitive.Input
          className={css.composerInput}
          placeholder={
            disabled ?
              "Chat actions available in Data Explorer for now"
            : "Ask about your data..."
          }
          rows={1}
          autoFocus={false}
          disabled={disabled}
        />
        <ComposerPrimitive.Send asChild>
          <ActionIcon
            variant="filled"
            color="primary"
            size="md"
            aria-label="Send message"
            disabled={disabled}
            className={css.composerSend}
          >
            <IconArrowUp size={16} />
          </ActionIcon>
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </div>
  );
}

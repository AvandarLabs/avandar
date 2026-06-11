import { ComposerPrimitive } from "@assistant-ui/react";
import { ActionIcon, Group } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import { ChatModelPicker } from "@/components/ChatPanel/ChatModelPicker/ChatModelPicker";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import css from "./Composer.module.css";

/**
 * The message input at the bottom of the thread: a text input, the model
 * picker, and the send button. Input and actions are disabled outside the Data
 * Explorer app, where chat actions are not yet available.
 */
export function Composer(): JSX.Element {
  const context = useChatPageContext();

  // we only allow chat in the data explorer for now
  const disabled = context.app !== "data-explorer";

  return (
    <div className={css.composerContainer}>
      <ComposerPrimitive.Root className={css.composer}>
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
        <Group gap="xs">
          <ChatModelPicker disabled={disabled} />
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
        </Group>
      </ComposerPrimitive.Root>
    </div>
  );
}

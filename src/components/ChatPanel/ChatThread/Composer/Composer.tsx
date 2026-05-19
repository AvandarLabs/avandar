import { ComposerPrimitive } from "@assistant-ui/react";
import { ActionIcon, Group } from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import clsx from "clsx";
import { ChatModelPicker } from "@/components/ChatPanel/ChatModelPicker/ChatModelPicker";
import { useChatPageContext } from "@/components/ChatPanel/useChatPageContext";
import css from "./Composer.module.css";

export function Composer(): JSX.Element {
  const context = useChatPageContext();
  const isChatEnabled =
    context.app === "data-explorer" || context.app === "dashboards";
  const disabled = !isChatEnabled;

  const placeholder =
    context.app === "dashboards" ?
      "Ask me to add a chart to this dashboard..."
    : context.app === "data-explorer" ? "Ask about your data..."
    : "Chat is enabled in Data Explorer and Dashboards";

  return (
    <div className={css.composerContainer}>
      <ComposerPrimitive.Root
        className={clsx(css.composer, disabled && css.composerDisabled)}
      >
        <ComposerPrimitive.Input
          className={css.composerInput}
          placeholder={placeholder}
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

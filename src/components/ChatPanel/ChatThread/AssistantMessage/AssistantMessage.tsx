import { ActionBarPrimitive, MessagePrimitive } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { Loader } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";
import { MarkdownTextPart } from "@/components/ChatPanel/ChatThread/MarkdownTextPart/MarkdownTextPart";
import css from "../ChatThread.module.css";

/**
 * Renders a single assistant turn in the thread: the message row and its
 * bubble. Selected by `ThreadPrimitive.Messages` for messages with the
 * `assistant` role. Shows a typing loader while the turn has no content yet,
 * then delegates content rendering to `MessagePrimitive.Parts`.
 */
export function AssistantMessage(): JSX.Element {
  const { t } = useLingui();
  return (
    <MessagePrimitive.Root className={css.assistantRow}>
      <div className={css.assistantStack}>
        <div className={css.assistantBubble}>
          <MessagePrimitive.If hasContent={false}>
            <Loader
              type="dots"
              size="sm"
              color="neutral.5"
              aria-label={t`Assistant is typing`}
            />
          </MessagePrimitive.If>
          <MessagePrimitive.Parts components={{ Text: MarkdownTextPart }} />
        </div>
        <MessagePrimitive.If hasContent={true}>
          <ActionBarPrimitive.Root className={css.assistantActions}>
            <ActionBarPrimitive.Reload
              className={css.tryAgainButton}
              aria-label={t`Try again`}
              title={t`Try again`}
            >
              <IconRefresh size={12} />
              <span>{t`Try again`}</span>
            </ActionBarPrimitive.Reload>
          </ActionBarPrimitive.Root>
        </MessagePrimitive.If>
      </div>
    </MessagePrimitive.Root>
  );
}

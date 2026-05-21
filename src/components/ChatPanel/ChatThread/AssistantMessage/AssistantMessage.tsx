import { MessagePrimitive } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { Loader } from "@mantine/core";
import { MarkdownTextPart } from "@/components/ChatPanel/ChatThread/MarkdownTextPart/MarkdownTextPart";
import css from "../ChatThread.module.css";

export function AssistantMessage(): JSX.Element {
  const { t } = useLingui();
  return (
    <MessagePrimitive.Root className={css.assistantRow}>
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
    </MessagePrimitive.Root>
  );
}

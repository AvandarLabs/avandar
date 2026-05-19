import { MessagePrimitive } from "@assistant-ui/react";
import { Loader } from "@mantine/core";
import { TextPart } from "@/components/ChatPanel/ChatThread/TextPart/TextPart";
import css from "../ChatThread.module.css";

export function AssistantMessage(): JSX.Element {
  return (
    <MessagePrimitive.Root className={css.assistantRow}>
      <div className={css.assistantBubble}>
        <MessagePrimitive.If hasContent={false}>
          <Loader
            type="dots"
            size="sm"
            color="neutral.5"
            aria-label="Assistant is typing"
          />
        </MessagePrimitive.If>
        <MessagePrimitive.Parts components={{ Text: TextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

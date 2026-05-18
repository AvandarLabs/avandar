import { MessagePrimitive } from "@assistant-ui/react";
import { TextPart } from "@/components/ChatPanel/ChatThread/TextPart/TextPart";
import css from "../ChatThread.module.css";

export function AssistantMessage(): JSX.Element {
  return (
    <MessagePrimitive.Root className={css.assistantRow}>
      <div className={css.assistantBubble}>
        <MessagePrimitive.Parts components={{ Text: TextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

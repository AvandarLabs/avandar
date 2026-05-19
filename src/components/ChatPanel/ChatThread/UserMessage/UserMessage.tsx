import { MessagePrimitive } from "@assistant-ui/react";
import { TextPart } from "@/components/ChatPanel/ChatThread/TextPart/TextPart";
import css from "../ChatThread.module.css";

export function UserMessage(): JSX.Element {
  return (
    <MessagePrimitive.Root className={css.userRow}>
      <div className={css.userBubble}>
        <MessagePrimitive.Parts components={{ Text: TextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

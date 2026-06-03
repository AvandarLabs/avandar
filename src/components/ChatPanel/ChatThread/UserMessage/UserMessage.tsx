import { MessagePrimitive } from "@assistant-ui/react";
import { MessageTextPart } from "../MessageTextPart/MessageTextPart";
import css from "./UserMessage.module.css";

/**
 * Renders a single user turn in the thread: the message row and its bubble.
 * Selected by `ThreadPrimitive.Messages` for messages with the `user` role and
 * delegates content rendering to `MessagePrimitive.Parts`.
 */
export function UserMessage(): JSX.Element {
  return (
    <MessagePrimitive.Root className={css.userMessageRow}>
      <div className={css.userMessageBubble}>
        <MessagePrimitive.Parts components={{ Text: MessageTextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

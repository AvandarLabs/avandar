import { MessagePrimitive, useMessage } from "@assistant-ui/react";
import { isHiddenChatThreadMessage } from "@/components/ChatPanel/ChatThread/isHiddenChatThreadMessage";
import { UserMessageTextPart } from "@/components/ChatPanel/ChatThread/UserMessage/UserMessageTextPart";
import css from "./UserMessage.module.css";

/**
 * Renders a single user turn in the thread: the message row and its bubble.
 * Selected by `ThreadPrimitive.Messages` for messages with the `user` role and
 * delegates content rendering to `MessagePrimitive.Parts`, drawing gadget
 * mentions in the text as chips.
 */
export function UserMessage(): React.ReactNode {
  const isHidden = useMessage(isHiddenChatThreadMessage);
  return isHidden ? null : (
    <MessagePrimitive.Root className={css.userMessageRow}>
      <div className={css.userMessageBubble}>
        <MessagePrimitive.Parts components={{ Text: UserMessageTextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

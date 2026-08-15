import { MessagePrimitive, useMessage } from "@assistant-ui/react";
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import { MessageTextPart } from "../MessageTextPart/MessageTextPart";
import css from "./UserMessage.module.css";

/**
 * Renders a single user turn in the thread: the message row and its bubble.
 * Selected by `ThreadPrimitive.Messages` for messages with the `user` role and
 * delegates content rendering to `MessagePrimitive.Parts`.
 */
export function UserMessage(): React.ReactNode {
  const isInternalDiscovery = useMessage((message) => {
    return DiscoveryContinuationMessage.isInternal(message.metadata);
  });
  return isInternalDiscovery ? null : (
      <MessagePrimitive.Root className={css.userMessageRow}>
        <div className={css.userMessageBubble}>
          <MessagePrimitive.Parts components={{ Text: MessageTextPart }} />
        </div>
      </MessagePrimitive.Root>
    );
}

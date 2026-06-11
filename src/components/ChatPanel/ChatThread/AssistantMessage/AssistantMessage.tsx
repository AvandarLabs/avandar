import { AuiIf, MessagePrimitive } from "@assistant-ui/react";
import { Loader } from "@mantine/core";
import { MessageTextPart } from "../MessageTextPart/MessageTextPart";
import css from "./AssistantMessage.module.css";

/**
 * Renders a single assistant turn in the thread: the message row and its
 * bubble. Selected by `ThreadPrimitive.Messages` for messages with the
 * `assistant` role. Shows a typing loader while the turn has no content yet,
 * then delegates content rendering to `MessagePrimitive.Parts`.
 */
export function AssistantMessage(): JSX.Element {
  return (
    <MessagePrimitive.Root className={css.assistantMessageRow}>
      <div className={css.assistantMessageBubble}>
        <AuiIf
          condition={(state) => {
            return state.message.parts.length === 0;
          }}
        >
          <Loader
            type="dots"
            size="sm"
            color="neutral.5"
            aria-label="Assistant is typing"
          />
        </AuiIf>
        <MessagePrimitive.Parts components={{ Text: MessageTextPart }} />
      </div>
    </MessagePrimitive.Root>
  );
}

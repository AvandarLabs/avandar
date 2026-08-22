import { MessagePartPrimitive } from "@assistant-ui/react";

import css from "./MessageTextPart.module.css";

/**
 * Renders a single text content part within a message. Mapped to the `Text`
 * slot of `MessagePrimitive.Parts`, so it is reused for both user and assistant
 * turns. A message may contain several parts (text, tool calls, etc.); this
 * component is responsible only for the text segments.
 */
export function MessageTextPart(): JSX.Element {
  return (
    <MessagePartPrimitive.Text className={css.messageText} component="div" />
  );
}

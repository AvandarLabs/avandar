import { MessagePartPrimitive } from "@assistant-ui/react";
import css from "../ChatThread.module.css";

export function TextPart(): JSX.Element {
  return (
    <MessagePartPrimitive.Text className={css.messageText} component="div" />
  );
}

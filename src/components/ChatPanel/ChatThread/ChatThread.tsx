import { ThreadPrimitive } from "@assistant-ui/react";
import { ChatEmptyState } from "@/components/ChatPanel/ChatEmptyState/ChatEmptyState";
import { AssistantMessage } from "@/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage";
import { Composer } from "@/components/ChatPanel/ChatThread/Composer/Composer";
import { RegenerateErrorBanner } from "@/components/ChatPanel/ChatThread/RegenerateErrorBanner/RegenerateErrorBanner";
import { UserMessage } from "@/components/ChatPanel/ChatThread/UserMessage/UserMessage";
import css from "./ChatThread.module.css";

/**
 * The main thread + composer composition for the chat panel. Composed from
 * Assistant UI primitives and styled with Avandar tokens.
 */
export function ChatThread(): JSX.Element {
  return (
    <ThreadPrimitive.Root className={css.thread}>
      <ThreadPrimitive.Viewport className={css.viewport}>
        <ThreadPrimitive.Empty>
          <ChatEmptyState />
        </ThreadPrimitive.Empty>
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
      </ThreadPrimitive.Viewport>
      <RegenerateErrorBanner />
      <Composer />
    </ThreadPrimitive.Root>
  );
}

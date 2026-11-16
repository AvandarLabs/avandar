import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { shouldSkipUserMessageConsent } from "@/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";

/**
 * The last thing the user actually asked, skipping the thread's machine
 * lines: clarification answers, view changes, and the case design kickoff.
 *
 * Use it wherever a question labels a result, such as the Data Explorer's
 * "From your prompt" banner or a chart saved to a dashboard, so the label is
 * the user's words rather than "[Clarification answer: US]". A mention reads
 * as `@Name` when `nameOf` is given; without it the text keeps its ref
 * tokens.
 */
export function getLastQuestionFromMessages(
  messages: ReadonlyArray<{ role: string; content: string }>,
  nameOf?: (ref: Gadget.Ref) => string,
): string {
  const lastQuestion = [...messages].reverse().find((message) => {
    return (
      message.role === "user" && !shouldSkipUserMessageConsent(message.content)
    );
  });
  const content = lastQuestion?.content ?? "";
  return nameOf ? ChatMentionToken.toDisplayText(content, nameOf) : content;
}

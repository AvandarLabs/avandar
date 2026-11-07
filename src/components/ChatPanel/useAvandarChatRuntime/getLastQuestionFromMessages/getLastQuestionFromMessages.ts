import { shouldSkipUserMessageConsent } from "@/components/ChatPanel/useAvandarChatRuntime/shouldSkipUserMessageConsent/shouldSkipUserMessageConsent";

/**
 * The last thing the user actually asked, skipping the thread's machine
 * lines: clarification answers, view changes, and the case design kickoff.
 *
 * Use it wherever a question labels a result, such as the Data Explorer's
 * "From your prompt" banner or a chart saved to a dashboard, so the label is
 * the user's words rather than "[Clarification answer: US]".
 */
export function getLastQuestionFromMessages(
  messages: ReadonlyArray<{ role: string; content: string }>,
): string {
  const lastQuestion = [...messages].reverse().find((message) => {
    return (
      message.role === "user" && !shouldSkipUserMessageConsent(message.content)
    );
  });
  return lastQuestion?.content ?? "";
}

import { useThreadRuntime } from "@assistant-ui/react";
import { Box } from "@mantine/core";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ClarificationCard } from "@/components/ChatPanel/ClarificationCard/ClarificationCard";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { crossBoundary } from "@/lib/privacy/crossBoundary";

/**
 * Renders the inline clarification card above the composer when the
 * backend has asked one. On answer:
 *
 *   - Free-text answers go through `crossBoundary` (PII + bias check on
 *     the user's typed text).
 *   - Fixed-option answers skip the modal (the LLM emitted the options,
 *     no new user data crosses the boundary).
 *   - "Let AI decide" sends a `null` answer marker so the model knows to
 *     proceed with its best guess.
 *
 * The answer is appended as a new user message with a structured
 * `[Clarification answer: ...]` block so the backend can count it
 * against the 3-clarifications-per-question cap.
 */
export function PendingClarificationBlock(): JSX.Element | null {
  const pending = ChatPanelStateManager.useState().pendingClarification;
  const dispatch = ChatPanelStateManager.useDispatch();
  const runtime = useThreadRuntime();
  const workspace = useCurrentWorkspace();

  if (!pending) {
    return null;
  }

  const submit = async (answer: string | string[] | null) => {
    let finalAnswer = answer;

    if (typeof answer === "string") {
      const result = await crossBoundary({
        text: answer,
        context: "clarification_answer",
        workspaceId: workspace.id,
      });
      if (!result.approved) {
        return;
      }
      if (typeof result.payload.text === "string") {
        finalAnswer = result.payload.text;
      }
    }

    dispatch.setPendingClarification(undefined);

    const renderedAnswer = _renderAnswer(finalAnswer);
    const userMessage = `[Clarification answer: ${renderedAnswer}]`;

    runtime?.append(userMessage);
  };

  return (
    <Box px="md" pb="xs">
      <ClarificationCard request={pending} onAnswer={submit} />
    </Box>
  );
}

function _renderAnswer(answer: string | string[] | null): string {
  if (answer === null) {
    return "(user let AI decide)";
  }
  if (Array.isArray(answer)) {
    return answer.join(", ");
  }
  return answer;
}

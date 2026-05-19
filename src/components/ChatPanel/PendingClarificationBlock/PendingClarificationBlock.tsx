import { useThreadRuntime } from "@assistant-ui/react";
import { Box } from "@mantine/core";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ClarificationCard } from "@/components/ChatPanel/ClarificationCard/ClarificationCard";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { recordOutcome } from "@/lib/privacy/clarificationAuditLog";
import { crossBoundary } from "@/lib/privacy/crossBoundary";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/useAvandarChatRuntime";

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
  const user = useCurrentUser();

  if (!pending) {
    return null;
  }

  const submit = async (answer: string | string[] | null) => {
    let finalAnswer = answer;

    if (typeof answer === "string" && user) {
      const result = await crossBoundary({
        text: answer,
        context: "clarification_answer",
        workspaceId: workspace.id,
        userId: user.id,
      });
      if (!result.approved) {
        // Cancel: log the outcome but don't append the message.
        const auditId = (pending as ChatClarifyRequestWithAudit).auditId;
        if (auditId) {
          await recordOutcome({ id: auditId, outcome: "cancelled" });
        }
        return;
      }
      if (typeof result.payload.text === "string") {
        finalAnswer = result.payload.text;
      }
    }

    dispatch.setPendingClarification(undefined);

    const auditId = (pending as ChatClarifyRequestWithAudit).auditId;
    if (auditId) {
      await recordOutcome({
        id: auditId,
        outcome: answer === null ? "let_ai_decide" : "answered",
      });
    }

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

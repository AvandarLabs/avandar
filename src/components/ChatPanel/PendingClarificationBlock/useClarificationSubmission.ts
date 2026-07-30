import { useThreadRuntime } from "@assistant-ui/react";
import { useCallback } from "react";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ClarificationAnswer } from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";
import { resolveClarificationAnswer } from "./resolveClarificationAnswer";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ClarificationSubmitAnswer } from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

/** Builds the submit handler for one pending clarification request. */
export function useClarificationSubmission(
  parameters: Readonly<{
    request: ChatClarifyRequestWithAudit | undefined;
    userId: User.Id | undefined;
    workspaceId: Workspace.Id;
  }>,
): (answer: ClarificationSubmitAnswer) => Promise<void> {
  const { request, userId, workspaceId } = parameters;
  const dispatch = ChatPanelStateManager.useDispatch();
  const runtime = useThreadRuntime();

  return useCallback(
    async function submitClarificationAnswer(answer) {
      if (!request) {
        return;
      }
      const resolvedAnswer = await resolveClarificationAnswer({
        answer,
        request,
        userId,
        workspaceId,
      });
      if (!resolvedAnswer) {
        return;
      }
      dispatch.setPendingClarification(undefined);
      if (request.auditId) {
        await ClarificationAuditEntryClient.recordOutcome({
          id: request.auditId as ClarificationAuditEntry.Id,
          outcome: "answered",
        });
      }
      runtime?.append(ClarificationAnswer.formatForThread(resolvedAnswer));
    },
    [dispatch, request, runtime, userId, workspaceId],
  );
}

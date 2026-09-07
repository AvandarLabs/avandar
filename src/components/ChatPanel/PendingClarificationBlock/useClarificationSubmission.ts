import { useThreadRuntime } from "@assistant-ui/react";
import { useCallback } from "react";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ClarificationAnswer } from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";
import { DiscoveryContinuationMessage } from "@/components/ChatPanel/DiscoveryContinuationMessage/DiscoveryContinuationMessage";
import { resolveClarificationAnswer } from "./resolveClarificationAnswer";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ClarificationAnswerHandler } from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";

/** Builds the submit handler for one pending clarification request. */
export function useClarificationSubmission(
  parameters: Readonly<{
    request: ChatClarifyRequestWithAudit | undefined;
    userId: User.Id | undefined;
    workspaceId: Workspace.Id;
  }>,
): ClarificationAnswerHandler {
  const { request, userId, workspaceId } = parameters;
  const dispatch = ChatPanelStateManager.useDispatch();
  const runtime = useThreadRuntime();

  return useCallback(
    async (submission: Parameters<ClarificationAnswerHandler>[0]) => {
      const { answer, isInternalDiscovery } = submission;
      if (!request) {
        return false;
      }
      const resolvedAnswer = await resolveClarificationAnswer({
        answer,
        request,
        userId,
        workspaceId,
      });
      if (!resolvedAnswer) {
        return false;
      }
      dispatch.setPendingClarification(undefined);
      if (request.auditId) {
        await ClarificationAuditEntryClient.recordOutcome({
          id: request.auditId as ClarificationAuditEntry.Id,
          outcome: "answered",
        });
      }
      const answerText = ClarificationAnswer.formatForThread(resolvedAnswer);
      runtime?.append(
        isInternalDiscovery
          ? {
              role: "user",
              content: [{ type: "text", text: answerText }],
              metadata: DiscoveryContinuationMessage.metadata,
            }
          : answerText,
      );
      return true;
    },
    [dispatch, request, runtime, userId, workspaceId],
  );
}

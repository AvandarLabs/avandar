import { useThreadRuntime } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { useCallback } from "react";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";

/**
 * Builds an action that abandons a failed query and requests another lookup.
 */
export function useDiscoveryRecovery(
  request: Readonly<ChatClarifyRequestWithAudit> | undefined,
): () => Promise<void> {
  const dispatch = ChatPanelStateManager.useDispatch();
  const runtime = useThreadRuntime();
  const { t } = useLingui();

  return useCallback(async () => {
    if (!request) {
      return;
    }
    dispatch.setPendingClarification(undefined);
    runtime?.append(
      t`[The local discovery lookup failed. Try a different column or lookup query without asking me to select from the failed catalog.]`,
    );
    if (request.auditId) {
      await ClarificationAuditEntryClient.recordOutcome({
        id: request.auditId as ClarificationAuditEntry.Id,
        outcome: "cancelled",
      });
    }
  }, [dispatch, request, runtime, t]);
}

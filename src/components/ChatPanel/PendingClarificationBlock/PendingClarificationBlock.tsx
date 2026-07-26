import { useThreadRuntime } from "@assistant-ui/react";
import { useLingui } from "@lingui/react/macro";
import { Box } from "@mantine/core";
import { useCallback } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import {
  clarificationAnswerNeedsCrossBoundary,
  formatClarificationAnswerForThread,
} from "@/components/ChatPanel/ClarificationCard/clarificationAnswer/clarificationAnswer";
import { ClarificationCard } from "@/components/ChatPanel/ClarificationCard/ClarificationCard";
import { ClarificationAuditLog } from "@/components/privacy/privacy-helpers/clarificationAuditLog";
import { crossBoundary } from "@/components/privacy/privacy-helpers/crossBoundary";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ClarificationSubmitAnswer } from "@/components/ChatPanel/ClarificationCard/clarificationAnswer/clarificationAnswer";
import type { DiscoveryResolver } from "@/components/ChatPanel/ClarificationCard/ClarificationCard";

/**
 * Renders the inline clarification card above the composer when the
 * backend has asked one. On answer:
 *
 *   - Custom / free-text answers go through `crossBoundary` (PII + bias).
 *   - Discovery preset picks cross as `discovery_clarification`.
 *   - Fixed-option preset picks skip the modal (LLM-emitted options only).
 *   - "None of the above" sends a structured marker for follow-up clarify.
 *
 * The answer is appended as a new user message so the backend can count it
 * against the 3-clarifications-per-question cap.
 */
export function PendingClarificationBlock(): React.ReactNode {
  const pending = ChatPanelStateManager.useState().pendingClarification;
  const dispatch = ChatPanelStateManager.useDispatch();
  const runtime = useThreadRuntime();
  const workspace = useCurrentWorkspace();
  const user = useCurrentUser();
  const { t } = useLingui();

  const resolveDiscovery = useCallback<DiscoveryResolver>(
    async (args) => {
      try {
        const result = await DuckDbClient.runRawQuery<Record<string, unknown>>(
          args.query,
        );
        const values = result.data
          .map((row) => {
            const keys = Object.keys(row);
            if (keys.length === 0) {
              return null;
            }
            const v = row[keys[0]!];
            if (v === null || v === undefined) {
              return null;
            }
            return String(v);
          })
          .filter((v): v is string => {
            return v !== null && v.length > 0;
          });
        const seen = new Set<string>();
        const deduped: string[] = [];
        for (const v of values) {
          if (!seen.has(v)) {
            seen.add(v);
            deduped.push(v);
            if (deduped.length >= 100) {
              break;
            }
          }
        }
        return { values: deduped };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : t`Discovery query failed.`,
        };
      }
    },
    [t],
  );

  if (!pending) {
    return null;
  }

  const submit = async (answer: ClarificationSubmitAnswer) => {
    let resolvedAnswer = answer;

    if (
      user &&
      clarificationAnswerNeedsCrossBoundary(answer, pending.responseShape)
    ) {
      if (answer.kind === "custom") {
        const result = await crossBoundary({
          text: answer.text,
          context: "clarification_answer",
          workspaceId: workspace.id,
          userId: user.id,
        });
        if (!result.approved) {
          const auditId = (pending as ChatClarifyRequestWithAudit).auditId;
          if (auditId) {
            await ClarificationAuditLog.recordOutcome({
              id: auditId,
              outcome: "cancelled",
            });
          }
          return;
        }
        if (typeof result.payload.text === "string") {
          resolvedAnswer = { kind: "custom", text: result.payload.text };
        }
      } else if (
        answer.kind === "preset" &&
        pending.responseShape.kind === "discovery"
      ) {
        const values =
          Array.isArray(answer.value) ? answer.value : [answer.value];
        const result = await crossBoundary({
          values,
          sourceColumn: pending.responseShape.column,
          sourceQuery: pending.responseShape.query,
          context: "discovery_clarification",
          workspaceId: workspace.id,
          userId: user.id,
        });
        if (!result.approved) {
          const auditId = (pending as ChatClarifyRequestWithAudit).auditId;
          if (auditId) {
            await ClarificationAuditLog.recordOutcome({
              id: auditId,
              outcome: "cancelled",
            });
          }
          return;
        }
        const approvedValues = result.payload.values as readonly string[];
        resolvedAnswer = {
          kind: "preset",
          value:
            Array.isArray(answer.value) ?
              [...approvedValues]
            : (approvedValues[0] ?? ""),
        };
      }
    }

    dispatch.setPendingClarification(undefined);

    const auditId = (pending as ChatClarifyRequestWithAudit).auditId;
    if (auditId) {
      await ClarificationAuditLog.recordOutcome({
        id: auditId,
        outcome: "answered",
      });
    }

    runtime?.append(formatClarificationAnswerForThread(resolvedAnswer));
  };

  return (
    <Box px="md" pb="xs">
      <ClarificationCard
        request={pending}
        onAnswer={submit}
        resolveDiscovery={resolveDiscovery}
      />
    </Box>
  );
}

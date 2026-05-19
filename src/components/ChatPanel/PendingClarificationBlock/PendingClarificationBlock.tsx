import { useThreadRuntime } from "@assistant-ui/react";
import { Box } from "@mantine/core";
import { useCallback } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { ChatPanelStateManager } from "@/components/ChatPanel/ChatPanelStateManager/ChatPanelStateManager";
import { ClarificationCard } from "@/components/ChatPanel/ClarificationCard/ClarificationCard";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { recordOutcome } from "@/lib/privacy/clarificationAuditLog";
import { crossBoundary } from "@/lib/privacy/crossBoundary";
import type { DiscoveryResolver } from "@/components/ChatPanel/ClarificationCard/ClarificationCard";
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

  const resolveDiscovery = useCallback<DiscoveryResolver>(async (args) => {
    try {
      const result = await DuckDbClient.runRawQuery<Record<string, unknown>>(
        args.query,
      );
      const values = result.data
        .map((row) => {
          // Discovery queries are expected to return a single column. We
          // pick the first column's value rather than keying on `args.column`
          // since the LLM sometimes aliases or renames it.
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
      // De-duplicate while preserving order. Cap at 100 to match the
      // LIMIT we ask the model to emit.
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
        error: e instanceof Error ? e.message : "Discovery query failed.",
      };
    }
  }, []);

  if (!pending) {
    return null;
  }

  const submit = async (answer: string | string[] | null) => {
    let finalAnswer = answer;
    const isDiscovery = pending.responseShape.kind === "discovery";

    // Discovery answers (the user picked from a dropdown of real data values)
    // cross the boundary as `discovery_clarification`. The PII detector
    // runs on column name + content; the medical-strict / composite modal
    // shows if needed.
    if (
      isDiscovery &&
      answer !== null &&
      user &&
      pending.responseShape.kind === "discovery"
    ) {
      const values = Array.isArray(answer) ? answer : [answer];
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
          await recordOutcome({ id: auditId, outcome: "cancelled" });
        }
        return;
      }
      // Use the post-edit values from the modal (Phase 2 v1 doesn't yet
      // expose an "Edit selection" hook; we trust the values that came out
      // of the modal one-to-one).
      const approvedValues = result.payload.values as readonly string[];
      finalAnswer =
        Array.isArray(answer) ? [...approvedValues] : (approvedValues[0] ?? "");
    } else if (typeof answer === "string" && user && !isDiscovery) {
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
      <ClarificationCard
        request={pending}
        onAnswer={submit}
        resolveDiscovery={resolveDiscovery}
      />
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

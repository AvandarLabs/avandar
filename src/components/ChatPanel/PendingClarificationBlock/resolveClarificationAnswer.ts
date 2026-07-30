import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { ClarificationAnswer } from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";
import { crossBoundary } from "@/components/privacy/privacy-helpers/crossBoundary";
import type { ChatClarifyRequestWithAudit } from "@/components/ChatPanel/chatClarify.types";
import type { ClarificationSubmitAnswer } from "@/components/ChatPanel/ClarificationCard/ClarificationAnswerModule/ClarificationAnswer";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";

async function _recordCancelledClarification(
  request: Readonly<ChatClarifyRequestWithAudit>,
): Promise<void> {
  if (request.auditId) {
    await ClarificationAuditEntryClient.recordOutcome({
      id: request.auditId as ClarificationAuditEntry.Id,
      outcome: "cancelled",
    });
  }
}

async function _resolveCustomAnswer(
  parameters: Readonly<{
    answer: Readonly<Extract<ClarificationSubmitAnswer, { kind: "custom" }>>;
    request: Readonly<ChatClarifyRequestWithAudit>;
    userId: User.Id;
    workspaceId: Workspace.Id;
  }>,
): Promise<ClarificationSubmitAnswer | undefined> {
  const { answer, request, userId, workspaceId } = parameters;
  const result = await crossBoundary({
    text: answer.text,
    context: "clarification_answer",
    workspaceId,
    userId,
  });
  if (!result.approved) {
    await _recordCancelledClarification(request);
    return undefined;
  }
  return typeof result.payload.text === "string" ?
      { kind: "custom", text: result.payload.text }
    : answer;
}

async function _resolveDiscoveryAnswer(
  parameters: Readonly<{
    answer: Readonly<Extract<ClarificationSubmitAnswer, { kind: "preset" }>>;
    request: Readonly<ChatClarifyRequestWithAudit> & {
      responseShape: Extract<
        ChatClarifyRequestWithAudit["responseShape"],
        { kind: "discovery" }
      >;
    };
    userId: User.Id;
    workspaceId: Workspace.Id;
  }>,
): Promise<ClarificationSubmitAnswer | undefined> {
  const { answer, request, userId, workspaceId } = parameters;
  const answerValues =
    Array.isArray(answer.value) ? answer.value : [answer.value];
  const result = await crossBoundary({
    values: answerValues,
    sourceColumn: request.responseShape.column,
    sourceQuery: request.responseShape.query,
    context: "discovery_clarification",
    workspaceId,
    userId,
  });
  if (!result.approved) {
    await _recordCancelledClarification(request);
    return undefined;
  }
  const approvedValues = result.payload.values as readonly string[];
  return {
    kind: "preset",
    value:
      Array.isArray(answer.value) ?
        [...approvedValues]
      : (approvedValues[0] ?? ""),
  };
}

/** Applies the privacy boundary required by a clarification answer. */
export async function resolveClarificationAnswer(
  parameters: Readonly<{
    answer: Readonly<ClarificationSubmitAnswer>;
    request: Readonly<ChatClarifyRequestWithAudit>;
    userId: User.Id | undefined;
    workspaceId: Workspace.Id;
  }>,
): Promise<ClarificationSubmitAnswer | undefined> {
  const { answer, request, userId, workspaceId } = parameters;
  if (
    !userId ||
    !ClarificationAnswer.needsCrossBoundary({
      answer,
      responseShape: request.responseShape,
    })
  ) {
    return answer;
  }
  if (answer.kind === "custom") {
    return _resolveCustomAnswer({ answer, request, userId, workspaceId });
  }
  if (answer.kind === "preset" && request.responseShape.kind === "discovery") {
    return _resolveDiscoveryAnswer({
      answer,
      request: { ...request, responseShape: request.responseShape },
      userId,
      workspaceId,
    });
  }
  return answer;
}

import { prop } from "@avandar/utils";
import { ClarificationAuditEntryClient } from "@/clients/privacy/ClarificationAuditEntryClient/ClarificationAuditEntryClient";
import { detectBias } from "@/components/privacy/privacy-helpers/detectBias/detectBias";
import type { ChatClarifyRequest } from "$/types/chat.types";
import type { ClarificationAuditEntry } from "@/models/privacy/ClarificationAuditEntry/ClarificationAuditEntry";

/**
 * Bias-checks a clarification card's question, warns on a hit and lets
 * the card through, and records that the card was shown. Returns the
 * audit id the card carries. A failed write still returns an id.
 */
export async function recordClarificationShown(
  options: Readonly<{
    workspaceId: string;
    clarification: ChatClarifyRequest;
  }>,
): Promise<ClarificationAuditEntry.Id> {
  const questionBias = detectBias(options.clarification.question);
  if (questionBias.hits.length > 0) {
    console.warn(
      "[chat] LLM clarification trips bias detector; passing through:",
      questionBias.hits.map(prop("label")),
    );
  }
  return ClarificationAuditEntryClient.recordShown({
    workspaceId: options.workspaceId,
    request: options.clarification,
  });
}

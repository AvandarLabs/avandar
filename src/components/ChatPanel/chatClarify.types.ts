import type { ChatClarifyRequest } from "$/types/chat.types";

/**
 * A pending clarification request carrying the optional Dexie audit-log id so
 * the UI can correlate the answer back to its telemetry entry. Extracted here
 * (rather than colocated with the chat runtime) so the clarification card and
 * turn-application helpers can share it without importing the runtime.
 */
export type ChatClarifyRequestWithAudit = ChatClarifyRequest & {
  auditId?: string;
};

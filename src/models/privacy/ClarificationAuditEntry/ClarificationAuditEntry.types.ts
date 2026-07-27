import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient.types";
import type { UUID } from "@utils/types/common.types";

/** Branded identifier for a local clarification audit record. */
export type ClarificationAuditEntryId = UUID<"ClarificationAuditEntry">;

/** Clarification outcomes persisted in the local audit log. */
export const ClarificationOutcomes = [
  "answered",
  "cancelled",
  "cap_reached",
  "neutral_failure",
] as const;

/** A clarification outcome persisted in the local audit log. */
export type ClarificationOutcome = (typeof ClarificationOutcomes)[number];

/** Clarification response shapes persisted in the local audit log. */
export const ClarificationResponseShapeLabels = [
  "free_text",
  "fixed_options_single",
  "fixed_options_multi",
  "discovery_single",
  "discovery_multi",
] as const;

/** A clarification response shape persisted in the local audit log. */
export type ClarificationResponseShapeLabel =
  (typeof ClarificationResponseShapeLabels)[number];

/** Complete browser-local clarification audit row. */
export type ClarificationAuditEntryRead = {
  id: ClarificationAuditEntryId;
  workspaceId: string;
  threadId: string | null;
  timestamp: number;
  turnNumber: 1 | 2 | 3;
  responseShape: ClarificationResponseShapeLabel;
  questionLengthChars: number;
  rationaleProvided: boolean;
  optionsCount: number | null;
  outcome: ClarificationOutcome;
  biasReprompts: number;
  timeToAnswerMs: number | null;
  ledToSuccessfulSql: boolean | null;
  patternLocale: string;
};

/** Dexie CRUD specification for browser-local clarification audit rows. */
export type ClarificationAuditEntryModel = DexieCrudModelSpec<{
  modelName: "ClarificationAuditEntry";
  primaryKey: "id";
  primaryKeyType: ClarificationAuditEntryId;
  dbTypes: {
    DBRead: ClarificationAuditEntryRead;
    DBUpdate: Partial<ClarificationAuditEntryRead>;
  };
  modelTypes: {
    Read: ClarificationAuditEntryRead;
    Update: Partial<ClarificationAuditEntryRead>;
  };
}>;

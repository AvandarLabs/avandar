import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient.types";
import type { UUID } from "@utils/types/common.types";

/** Branded identifier for a local consent audit record. */
export type ConsentAuditEntryId = UUID<"ConsentAuditEntry">;

/** A consent decision persisted in the local audit log. */
export type ConsentDecisionKind =
  | "approved"
  | "used_suggestion"
  | "cancelled"
  | "edited";

/** A cross-boundary context that can require consent. */
export type ConsentAuditContext =
  | "discovery_clarification"
  | "generated_sql_assumptions"
  | "plan_step_input"
  | "user_message_text"
  | "clarification_answer";

/** A consent-modal mode persisted with the decision. */
export type ConsentAuditMode =
  | "clean"
  | "pii_warning"
  | "bias_nudge"
  | "composite"
  | "medical_strict";

/** A warning category shown or dismissed during consent. */
export type ConsentAuditWarning = "pii" | "bias" | "medical";

/** A source that can trigger the medical data consent tier. */
export type ConsentAuditMedicalTier = "column" | "content" | "workspace_flag";

/** Complete browser-local consent audit row. */
export type ConsentAuditEntryRead = {
  id: ConsentAuditEntryId;
  workspaceId: string;
  userId: string;
  threadId: string | null;
  timestamp: number;
  decision: ConsentDecisionKind;
  context: ConsentAuditContext;
  mode: ConsentAuditMode;
  detectedPii: string[];
  detectedBias: string[];
  sourceColumn: string | null;
  valueCount: number;
  contentLengthChars: number | null;
  warningShown: ConsentAuditWarning[];
  warningDismissed: ConsentAuditWarning[];
  suggestionUsed: boolean | null;
  patternLocale: string;
  detectorVersion: string;
  medicalTierTriggeredBy: ConsentAuditMedicalTier | null;
  typedConfirmationCorrect: boolean | null;
  ackTokenNonce: string | null;
};

/** Dexie CRUD specification for browser-local consent audit rows. */
export type ConsentAuditEntryModel = DexieCrudModelSpec<{
  modelName: "ConsentAuditEntry";
  primaryKey: "id";
  primaryKeyType: ConsentAuditEntryId;
  dbTypes: {
    DBRead: ConsentAuditEntryRead;
    DBUpdate: Partial<ConsentAuditEntryRead>;
  };
  modelTypes: {
    Read: ConsentAuditEntryRead;
    Update: Partial<ConsentAuditEntryRead>;
  };
}>;

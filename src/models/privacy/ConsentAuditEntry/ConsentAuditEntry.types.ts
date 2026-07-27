import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient.types";
import type { UUID } from "@utils/types/common.types";

/** Branded identifier for a local consent audit record. */
export type ConsentAuditEntryId = UUID<"ConsentAuditEntry">;

/** Consent decisions persisted in the local audit log. */
export const ConsentDecisionKinds = [
  "approved",
  "used_suggestion",
  "cancelled",
  "edited",
] as const;

/** A consent decision persisted in the local audit log. */
export type ConsentDecisionKind = (typeof ConsentDecisionKinds)[number];

/** Checks whether a string is a persisted consent decision. */
export function isValidConsentDecisionKind(
  value: string,
): value is ConsentDecisionKind {
  return (ConsentDecisionKinds as readonly string[]).includes(value);
}

/** Cross-boundary contexts that can require consent. */
export const ConsentAuditContexts = [
  "discovery_clarification",
  "generated_sql_assumptions",
  "plan_step_input",
  "user_message_text",
  "clarification_answer",
] as const;

/** A cross-boundary context that can require consent. */
export type ConsentAuditContext = (typeof ConsentAuditContexts)[number];

/** Checks whether a string is a cross-boundary consent context. */
export function isValidConsentAuditContext(
  value: string,
): value is ConsentAuditContext {
  return (ConsentAuditContexts as readonly string[]).includes(value);
}

/** Consent-modal modes persisted with the decision. */
export const ConsentAuditModes = [
  "clean",
  "pii_warning",
  "bias_nudge",
  "composite",
  "medical_strict",
] as const;

/** A consent-modal mode persisted with the decision. */
export type ConsentAuditMode = (typeof ConsentAuditModes)[number];

/** Checks whether a string is a persisted consent-modal mode. */
export function isValidConsentAuditMode(
  value: string,
): value is ConsentAuditMode {
  return (ConsentAuditModes as readonly string[]).includes(value);
}

/** Warning categories shown or dismissed during consent. */
export const ConsentAuditWarnings = ["pii", "bias", "medical"] as const;

/** A warning category shown or dismissed during consent. */
export type ConsentAuditWarning = (typeof ConsentAuditWarnings)[number];

/** Checks whether a string is a consent warning category. */
export function isValidConsentAuditWarning(
  value: string,
): value is ConsentAuditWarning {
  return (ConsentAuditWarnings as readonly string[]).includes(value);
}

/** Sources that can trigger the medical data consent tier. */
export const ConsentAuditMedicalTiers = [
  "column",
  "content",
  "workspace_flag",
] as const;

/** A source that can trigger the medical data consent tier. */
export type ConsentAuditMedicalTier =
  (typeof ConsentAuditMedicalTiers)[number];

/** Checks whether a string is a medical consent-tier source. */
export function isValidConsentAuditMedicalTier(
  value: string,
): value is ConsentAuditMedicalTier {
  return (ConsentAuditMedicalTiers as readonly string[]).includes(value);
}

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

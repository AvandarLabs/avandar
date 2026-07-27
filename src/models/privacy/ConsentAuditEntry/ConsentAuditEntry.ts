/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ConsentAuditContext,
  ConsentAuditEntryId,
  ConsentAuditEntryModel,
  ConsentAuditMedicalTier,
  ConsentAuditMode,
  ConsentAuditWarning,
  ConsentDecisionKind,
} from "./ConsentAuditEntry.types";

/** Consent decisions persisted in the local audit log. */
export const ConsentDecisionKinds = [
  "approved",
  "used_suggestion",
  "cancelled",
  "edited",
] as const satisfies readonly ConsentDecisionKind[];

/** Cross-boundary contexts that can require consent. */
export const ConsentAuditContexts = [
  "discovery_clarification",
  "generated_sql_assumptions",
  "plan_step_input",
  "user_message_text",
  "clarification_answer",
] as const satisfies readonly ConsentAuditContext[];

/** Consent-modal modes persisted with the decision. */
export const ConsentAuditModes = [
  "clean",
  "pii_warning",
  "bias_nudge",
  "composite",
  "medical_strict",
] as const satisfies readonly ConsentAuditMode[];

/** Warning categories shown or dismissed during consent. */
export const ConsentAuditWarnings = [
  "pii",
  "bias",
  "medical",
] as const satisfies readonly ConsentAuditWarning[];

/** Sources that can trigger the medical data consent tier. */
export const ConsentAuditMedicalTiers = [
  "column",
  "content",
  "workspace_flag",
] as const satisfies readonly ConsentAuditMedicalTier[];

/** Checks whether a string is a persisted consent decision. */
export function isValidConsentDecisionKind(
  value: string,
): value is ConsentDecisionKind {
  return (ConsentDecisionKinds as readonly string[]).includes(value);
}

/** Checks whether a string is a cross-boundary consent context. */
export function isValidConsentAuditContext(
  value: string,
): value is ConsentAuditContext {
  return (ConsentAuditContexts as readonly string[]).includes(value);
}

/** Checks whether a string is a persisted consent-modal mode. */
export function isValidConsentAuditMode(
  value: string,
): value is ConsentAuditMode {
  return (ConsentAuditModes as readonly string[]).includes(value);
}

/** Checks whether a string is a consent warning category. */
export function isValidConsentAuditWarning(
  value: string,
): value is ConsentAuditWarning {
  return (ConsentAuditWarnings as readonly string[]).includes(value);
}

/** Checks whether a string is a medical consent-tier source. */
export function isValidConsentAuditMedicalTier(
  value: string,
): value is ConsentAuditMedicalTier {
  return (ConsentAuditMedicalTiers as readonly string[]).includes(value);
}

/** Namespace entry point for the consent audit AvaModel. */
export namespace ConsentAuditEntry {
  /** Dexie CRUD model specification for consent audit entries. */
  export type Model = ConsentAuditEntryModel;

  /** Complete browser-local consent audit row. */
  export type T<K extends keyof ConsentAuditEntryModel = "Read"> =
    ConsentAuditEntryModel[K];

  /** Branded identifier for a browser-local consent audit row. */
  export type Id = ConsentAuditEntryId;
}

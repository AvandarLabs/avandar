/* eslint-disable @typescript-eslint/no-namespace */
import {
  ConsentAuditContexts,
  ConsentAuditMedicalTiers,
  ConsentAuditModes,
  ConsentAuditWarnings,
  ConsentDecisionKinds,
} from "./ConsentAuditEntry.constants";
import type {
  ConsentAuditContext,
  ConsentAuditEntryId,
  ConsentAuditEntryModel,
  ConsentAuditMedicalTier,
  ConsentAuditMode,
  ConsentAuditWarning,
  ConsentDecisionKind,
} from "./ConsentAuditEntry.types";

export {
  ConsentAuditContexts,
  ConsentAuditMedicalTiers,
  ConsentAuditModes,
  ConsentAuditWarnings,
  ConsentDecisionKinds,
};

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

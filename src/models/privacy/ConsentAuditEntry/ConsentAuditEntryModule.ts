import type {
  ConsentAuditContext,
  ConsentAuditMedicalTier,
  ConsentAuditMode,
  ConsentAuditWarning,
  ConsentDecisionKind,
} from "./ConsentAuditEntry.types";

import {
  ConsentAuditContexts,
  ConsentAuditMedicalTiers,
  ConsentAuditModes,
  ConsentAuditWarnings,
  ConsentDecisionKinds,
} from "./ConsentAuditEntry.constants";

export const ConsentAuditEntryModule = {
  /** Checks whether a string is a persisted consent decision. */
  isValidConsentDecisionKind: (value: string): value is ConsentDecisionKind => {
    return (ConsentDecisionKinds as readonly string[]).includes(value);
  },

  /** Checks whether a string is a cross-boundary consent context. */
  isValidConsentAuditContext: (value: string): value is ConsentAuditContext => {
    return (ConsentAuditContexts as readonly string[]).includes(value);
  },

  /** Checks whether a string is a persisted consent-modal mode. */
  isValidConsentAuditMode: (value: string): value is ConsentAuditMode => {
    return (ConsentAuditModes as readonly string[]).includes(value);
  },

  /** Checks whether a string is a consent warning category. */
  isValidConsentAuditWarning: (value: string): value is ConsentAuditWarning => {
    return (ConsentAuditWarnings as readonly string[]).includes(value);
  },

  /** Checks whether a string is a medical consent-tier source. */
  isValidConsentAuditMedicalTier: (
    value: string,
  ): value is ConsentAuditMedicalTier => {
    return (ConsentAuditMedicalTiers as readonly string[]).includes(value);
  },
};

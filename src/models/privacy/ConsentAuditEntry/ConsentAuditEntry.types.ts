import type {
  ConsentAuditContexts,
  ConsentAuditMedicalTiers,
  ConsentAuditModes,
  ConsentAuditWarnings,
  ConsentDecisionKinds,
} from "./ConsentAuditEntry.constants";
import type { DexieCrudModelSpec } from "@/clients/dexie/DexieCrudClient/DexieCrudClient.types";
import type { UUID } from "@avandar/utils";

/** Branded identifier for a local consent audit record. */
export type ConsentAuditEntryId = UUID<"ConsentAuditEntry">;

/** A consent decision persisted in the local audit log. */
export type ConsentDecisionKind = (typeof ConsentDecisionKinds)[number];

/** A cross-boundary context that can require consent. */
export type ConsentAuditContext = (typeof ConsentAuditContexts)[number];

/** A consent-modal mode persisted with the decision. */
export type ConsentAuditMode = (typeof ConsentAuditModes)[number];

/** A warning category shown or dismissed during consent. */
export type ConsentAuditWarning = (typeof ConsentAuditWarnings)[number];

/** A source that can trigger the medical data consent tier. */
export type ConsentAuditMedicalTier = (typeof ConsentAuditMedicalTiers)[number];

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

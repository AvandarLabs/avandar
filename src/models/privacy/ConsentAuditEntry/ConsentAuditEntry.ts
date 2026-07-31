/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ConsentAuditEntryId,
  ConsentAuditEntryModel,
} from "./ConsentAuditEntry.types";

export { ConsentAuditEntryModule as ConsentAuditEntry } from "./ConsentAuditEntryModule";

export {
  ConsentAuditContexts,
  ConsentAuditMedicalTiers,
  ConsentAuditModes,
  ConsentAuditWarnings,
  ConsentDecisionKinds,
} from "./ConsentAuditEntry.constants";

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

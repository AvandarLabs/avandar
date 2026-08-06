/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import type {
  ClarificationAuditEntryId,
  ClarificationAuditEntryModel,
} from "./ClarificationAuditEntry.types";

export { ClarificationAuditEntryModule as ClarificationAuditEntry } from "./ClarificationAuditEntryModule";

export {
  ClarificationOutcomes,
  ClarificationResponseShapeLabels,
} from "./ClarificationAuditEntry.constants";

/** Namespace entry point for the clarification audit AvaModel. */
export namespace ClarificationAuditEntry {
  /** Dexie CRUD model specification for clarification audit entries. */
  export type Model = ClarificationAuditEntryModel;

  /** Complete browser-local clarification audit row. */
  export type T<K extends keyof ClarificationAuditEntryModel = "Read"> =
    ClarificationAuditEntryModel[K];

  /** Branded identifier for a browser-local clarification audit row. */
  export type Id = ClarificationAuditEntryId;
}

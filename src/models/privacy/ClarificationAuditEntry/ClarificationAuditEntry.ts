/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ClarificationAuditEntryId,
  ClarificationAuditEntryModel,
} from "./ClarificationAuditEntry.types";

/** Namespace entry point for the clarification audit AvaModel. */
export namespace ClarificationAuditEntry {
  /** Complete browser-local clarification audit row. */
  export type T<K extends keyof ClarificationAuditEntryModel = "Read"> =
    ClarificationAuditEntryModel[K];

  /** Branded identifier for a browser-local clarification audit row. */
  export type Id = ClarificationAuditEntryId;
}

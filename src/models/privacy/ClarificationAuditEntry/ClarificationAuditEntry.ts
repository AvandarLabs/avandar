/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ClarificationAuditEntryId,
  ClarificationAuditEntryModel,
} from "./ClarificationAuditEntry.types";

/** Namespace entry point for the clarification audit AvaModel. */
export namespace ClarificationAuditEntry {
  export type T<K extends keyof ClarificationAuditEntryModel = "Read"> =
    ClarificationAuditEntryModel[K];
  export type Id = ClarificationAuditEntryId;
}

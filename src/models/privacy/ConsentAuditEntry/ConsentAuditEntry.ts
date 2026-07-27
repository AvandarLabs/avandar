/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ConsentAuditEntryId,
  ConsentAuditEntryModel,
} from "./ConsentAuditEntry.types";

/** Namespace entry point for the consent audit AvaModel. */
export namespace ConsentAuditEntry {
  /** Complete browser-local consent audit row. */
  export type T<K extends keyof ConsentAuditEntryModel = "Read"> =
    ConsentAuditEntryModel[K];

  /** Branded identifier for a browser-local consent audit row. */
  export type Id = ConsentAuditEntryId;
}

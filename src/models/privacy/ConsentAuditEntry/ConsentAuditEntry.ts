/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ConsentAuditEntryId,
  ConsentAuditEntryModel,
} from "./ConsentAuditEntry.types";

/** Namespace entry point for the consent audit AvaModel. */
export namespace ConsentAuditEntry {
  export type T<K extends keyof ConsentAuditEntryModel = "Read"> =
    ConsentAuditEntryModel[K];
  export type Id = ConsentAuditEntryId;
}

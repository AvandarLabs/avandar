/* eslint-disable @typescript-eslint/no-namespace */
import {
  ClarificationOutcomes,
  ClarificationResponseShapeLabels,
} from "./ClarificationAuditEntry.constants";
import type {
  ClarificationAuditEntryId,
  ClarificationAuditEntryModel,
  ClarificationOutcome,
  ClarificationResponseShapeLabel,
} from "./ClarificationAuditEntry.types";

export { ClarificationOutcomes, ClarificationResponseShapeLabels };

/** Checks whether a string is a persisted clarification outcome. */
export function isValidClarificationOutcome(
  value: string,
): value is ClarificationOutcome {
  return (ClarificationOutcomes as readonly string[]).includes(value);
}

/** Checks whether a string is a persisted clarification response shape. */
export function isValidClarificationResponseShapeLabel(
  value: string,
): value is ClarificationResponseShapeLabel {
  return (ClarificationResponseShapeLabels as readonly string[]).includes(
    value,
  );
}

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

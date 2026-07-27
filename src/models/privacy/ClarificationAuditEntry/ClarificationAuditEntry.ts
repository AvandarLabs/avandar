/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ClarificationAuditEntryId,
  ClarificationAuditEntryModel,
  ClarificationOutcome,
  ClarificationResponseShapeLabel,
} from "./ClarificationAuditEntry.types";

/** Clarification outcomes persisted in the local audit log. */
export const ClarificationOutcomes = [
  "answered",
  "cancelled",
  "cap_reached",
  "neutral_failure",
] as const satisfies readonly ClarificationOutcome[];

/** Clarification response shapes persisted in the local audit log. */
export const ClarificationResponseShapeLabels = [
  "free_text",
  "fixed_options_single",
  "fixed_options_multi",
  "discovery_single",
  "discovery_multi",
] as const satisfies readonly ClarificationResponseShapeLabel[];

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

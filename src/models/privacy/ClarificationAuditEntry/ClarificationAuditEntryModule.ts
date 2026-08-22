import type {
  ClarificationOutcome,
  ClarificationResponseShapeLabel,
} from "./ClarificationAuditEntry.types";

import {
  ClarificationOutcomes,
  ClarificationResponseShapeLabels,
} from "./ClarificationAuditEntry.constants";

export const ClarificationAuditEntryModule = {
  /** Checks whether a string is a persisted clarification outcome. */
  isValidClarificationOutcome: (
    value: string,
  ): value is ClarificationOutcome => {
    return (ClarificationOutcomes as readonly string[]).includes(value);
  },

  /** Checks whether a string is a persisted clarification response shape. */
  isValidClarificationResponseShapeLabel: (
    value: string,
  ): value is ClarificationResponseShapeLabel => {
    return (ClarificationResponseShapeLabels as readonly string[]).includes(
      value,
    );
  },
};

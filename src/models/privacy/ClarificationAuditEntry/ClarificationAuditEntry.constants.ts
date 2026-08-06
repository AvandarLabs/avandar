/** Clarification outcomes persisted in the local audit log. */
export const ClarificationOutcomes = [
  "answered",
  "cancelled",
  "cap_reached",
  "neutral_failure",
] as const;

/** Clarification response shapes persisted in the local audit log. */
export const ClarificationResponseShapeLabels = [
  "free_text",
  "fixed_options_single",
  "fixed_options_multi",
  "discovery_single",
  "discovery_multi",
] as const;

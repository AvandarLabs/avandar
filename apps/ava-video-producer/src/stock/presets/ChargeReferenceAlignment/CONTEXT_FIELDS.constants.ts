/** Matched billing context fields and their authored display labels. */
export const CONTEXT_FIELDS = [
  ["procedureCode", "procedure"],
  ["providerKey", "provider"],
  ["payerKey", "payer"],
  ["periodLabel", "period"],
  ["quantity", "quantity"],
] as const;

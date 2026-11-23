const VALUES = [
  "subject",
  "metric",
  "value",
  "unit",
  "period",
  "qualifier",
] as const;
/** A semantic observation role, excluding the sentence connector. */
export type ProseSemanticRole = (typeof VALUES)[number];
/** The semantic observation roles in their stable extraction order. */
export const ProseSemanticRoles = {
  /** Semantic roles accepted by prose measurement ledger entries. */
  values: VALUES,
  /** Whether a value names a semantic observation role. */
  isValid: (value: unknown): value is ProseSemanticRole => {
    return VALUES.some((role) => {
      return role === value;
    });
  },
};

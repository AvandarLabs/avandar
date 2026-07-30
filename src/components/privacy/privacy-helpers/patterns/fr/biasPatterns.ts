/**
 * French patterns remain inert until advisor review supplies approved terms.
 * The detector therefore falls back to English-only patterns for this locale.
 */
export const biasPatterns = {
  status: "stub_pending_advisor_review",
} as const;

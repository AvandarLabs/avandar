/**
 * Stub metadata for French (fr) bias patterns, pending advisor review.
 * French bias patterns are disabled until domain review supplies approved terms
 * (non-English patterns are deliberately not machine-translated), so
 * `detectBias` falls back to English-only patterns and French-locale users see
 * the English detector with translated UX copy. To add patterns, copy the shape
 * from `detectBias.ts`, but keep this file frozen until the locale expansion is
 * approved.
 */
export const biasPatterns = {
  status: "stub_pending_advisor_review",
} as const;

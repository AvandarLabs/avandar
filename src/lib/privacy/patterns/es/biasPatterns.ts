/**
 * Spanish (es) bias-pattern stubs.
 *
 * Per the chat-interactive-workflows spec, the v1 ship is
 * English-only with stubbed Spanish + French files. Non-English bias
 * patterns are explicitly **NOT** machine-translated: they require a
 * social-sector-advisor review (decision log #1 of the spec) before
 * they are turned on.
 *
 * Adding patterns: copy the shape from
 * `src/lib/privacy/biasDetector.ts`, but keep this file frozen until
 * the locale expansion and the advisor review have signed off. Until then,
 * `detectBias` falls back to English-only patterns and Spanish-locale
 * users see the English detector with translated UX copy.
 */

export const PATTERNS_STATUS = "stub_pending_advisor_review" as const;

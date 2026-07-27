/** Consent decisions persisted in the local audit log. */
export const ConsentDecisionKinds = [
  "approved",
  "used_suggestion",
  "cancelled",
  "edited",
] as const;

/** Cross-boundary contexts that can require consent. */
export const ConsentAuditContexts = [
  "discovery_clarification",
  "generated_sql_assumptions",
  "plan_step_input",
  "user_message_text",
  "clarification_answer",
] as const;

/** Consent-modal modes persisted with the decision. */
export const ConsentAuditModes = [
  "clean",
  "pii_warning",
  "bias_nudge",
  "composite",
  "medical_strict",
] as const;

/** Warning categories shown or dismissed during consent. */
export const ConsentAuditWarnings = ["pii", "bias", "medical"] as const;

/** Sources that can trigger the medical data consent tier. */
export const ConsentAuditMedicalTiers = [
  "column",
  "content",
  "workspace_flag",
] as const;

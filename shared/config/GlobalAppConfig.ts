// ============================================================================
// Core app configurations
// ============================================================================
export const APP_NAME = "Avandar";

/** The email address to use for support inquiries */
export const SUPPORT_EMAIL = "support@avandarlabs.com";

/** The email address to use for general inquiries */
export const INFO_EMAIL = "info@avandarlabs.com";

/**
 * The URL to the waitlist page. This is only used if self-registration is
 * disabled or if we require a sign up code to register.
 */
export const WAITLIST_URL = "https://avandarlabs.com/waitlist";

// ============================================================================
// Subscription plan configurations
// ============================================================================

/** The maximum number of seats allowed for the free plan. */
export const MAX_FREE_PLAN_SEATS = 2;

// ============================================================================
// Global app configuration object
// ============================================================================

/**
 * Configuration that is meaningful in every runtime: the web app, the desktop
 * app, and the Supabase edge functions. Prefer importing from here when a
 * setting must stay in sync everywhere.
 *
 * Settings that only make sense inside the browser bundle belong in
 * `WebAppConfig` (`src/config/WebAppConfig.ts`) instead.
 */
export const GlobalAppConfig = {
  chat: {
    /** Default OpenRouter model when the client does not send a selection. */
    defaultModelId: "openai/gpt-4o-mini",

    /**
     * Model class tokens matched against OpenRouter id, canonical_slug, and
     * display name. A model must match at least one token to appear in the
     * picker (in addition to tool-support and stability filters).
     */
    allowedModelClasses: [
      "gpt-4o-mini",
      "gpt-4o",
      "gpt-5",
      "o1",
      "o3",
      "o4",
      "claude",
      "gemini",
      "llama",
      "kimi",
      "deepseek",
      "mistral",
      "qwen",
    ],

    /**
     * Class tokens for proprietary-hosted models (OpenAI, Anthropic, Google).
     * Checked before `openModelClasses` when assigning a license tier.
     */
    proprietaryModelClasses: [
      "openai",
      "gpt",
      "o1",
      "o3",
      "o4",
      "anthropic",
      "claude",
      "google",
      "gemini",
    ],

    /** Class tokens for open-weights / open-model families. */
    openModelClasses: [
      "meta-llama",
      "llama",
      "kimi",
      "moonshot",
      "qwen",
      "deepseek",
      "mistral",
      "gemma",
    ],
  },

  /** Limits for dataset ingest and preview in the data manager app. */
  dataManagerApp: {
    /** Maximum length of dataset name */
    maxDatasetNameLength: 100,

    /** Maximum length of dataset description */
    maxDatasetDescriptionLength: 500,

    /** Maximum number of rows to preview */
    maxPreviewRows: 200,
  },
} as const;

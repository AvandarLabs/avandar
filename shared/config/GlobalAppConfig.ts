/** Application display name. */
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

/** The maximum number of seats allowed for the free plan. */
export const MAX_FREE_PLAN_SEATS = 2;

/**
 * Configuration that is meaningful in every runtime: the web app, the desktop
 * app, and the Supabase edge functions. Prefer importing from here when a
 * setting must stay in sync everywhere.
 *
 * Settings that only make sense inside the browser bundle belong in
 * `WebAppConfig` (`src/config/WebAppConfig.ts`) instead.
 */
export const GlobalAppConfig = {
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

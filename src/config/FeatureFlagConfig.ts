import type { Registry } from "@utils";

/**
 * Feature flags are used to enable or disable certain features in the app.
 * They are defined in the .env file and are separated by semicolons.
 *
 * **NOTE**: we use an enum here instead of a string literal union so that
 * we can document each flag individually.
 */
export enum FeatureFlag {
  /**
   * Disable self-registration.
   * When this is on, the registration page will display a message telling
   * the user the app is not accepting new users.
   *
   * **NOTE**: the Supabase auth API will still allow registrations if it
   * receives a valid request. To disable this you will need to actually
   * go to your Supabase auth settings and disable allowing new users
   * to sign up.
   */
  DisableSelfRegistration = "disable-self-registration",

  /**
   * Require a sign up code to register. A user's signup code and email
   * combination must match an email/signup-code combination in the
   * waitlist_signups table.
   *
   * This flag takes precedence over the DisableSelfRegistration flag.
   */
  RequireSignUpCode = "require-sign-up-code",

  /**
   * Disable manual entity fields. Users are not allowed to manually change
   * the values of entity fields. This will be removed once the feature is
   * ready.
   */
  DisableManualData = "disable-manual-data",

  /**
   * Disable the Geo Explorer feature.
   */
  DisableGeoExplorer = "disable-geo-explorer",

  /**
   * Disable the Profile Manager feature.
   */
  DisableProfileManager = "disable-profile-manager",

  /**
   * Enable the in-app user feedback widget (Featurebase).
   *
   * When this is on, the feedback button will be enabled. By default, it is
   * disabled. Enable this only if you want to allow users to submit feedback.
   * This requires a Featurebase account and organization setup.
   */
  EnableUserFeedback = "enable-user-feedback",

  /**
   * Enable the "Shared with me" nav item and page.
   *
   * When this is on, workspace members can open the shared-with-me route and
   * follow "See all shared items" links from share-only resource banners.
   * Disabled by default until the feature is ready for general use.
   */
  EnableSharedWithMe = "enable-shared-with-me",

  /**
   * Disable the DuckDB-WASM spatial extension.
   *
   * DuckDB-WASM fetches the spatial extension binary at runtime from
   * `extensions.duckdb.org`. In environments where outbound network access
   * is restricted (sandboxed dev containers, offline demos) the fetch
   * stalls DuckDB initialization. This flag skips the `LOAD spatial;`
   * call so the rest of the database boots and CSV / XLSX / Parquet
   * paths keep working — at the cost of any geo queries that rely on
   * spatial functions.
   */
  DisableDuckDbSpatial = "disable-duckdb-spatial",
}

export const FeatureFlagConfig = {
  [FeatureFlag.DisableSelfRegistration]: {
    waitlistURL: "https://avandarlabs.com/waitlist",
  },
  [FeatureFlag.RequireSignUpCode]: undefined,
  [FeatureFlag.DisableManualData]: undefined,
  [FeatureFlag.DisableGeoExplorer]: undefined,
  [FeatureFlag.DisableProfileManager]: undefined,
  [FeatureFlag.EnableUserFeedback]: undefined,
  [FeatureFlag.EnableSharedWithMe]: undefined,
  [FeatureFlag.DisableDuckDbSpatial]: undefined,
} as const satisfies Registry<FeatureFlag>;

export function isFlagEnabled(featureFlag: FeatureFlag): boolean {
  const envFlagsStr = import.meta.env.VITE_FEATURE_FLAGS;
  if (envFlagsStr && typeof envFlagsStr === "string") {
    const flags = envFlagsStr.split(",");
    return flags.includes(featureFlag);
  }
  return false;
}

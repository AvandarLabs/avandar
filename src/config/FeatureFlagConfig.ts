import type { Registry } from "$/lib/types/utilityTypes";

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
   * Disable inviting users to a workspace until the feature is ready.
   */
  DisableUserInvites = "disable-user-invites",

  /**
   * Disable the Geo Explorer feature.
   */
  DisableGeoExplorer = "disable-geo-explorer",
}

export const FeatureFlagConfig = {
  [FeatureFlag.DisableSelfRegistration]: {
    waitlistURL: "https://avandarlabs.com/waitlist",
  },
  [FeatureFlag.RequireSignUpCode]: undefined,
  [FeatureFlag.DisableManualData]: undefined,
  [FeatureFlag.DisableUserInvites]: undefined,
  [FeatureFlag.DisableGeoExplorer]: undefined,
} as const satisfies Registry<FeatureFlag>;

export function isFlagEnabled(featureFlag: FeatureFlag): boolean {
  const envFlagsStr = import.meta.env.VITE_FEATURE_FLAGS;
  if (envFlagsStr && typeof envFlagsStr === "string") {
    const flags = envFlagsStr.split(",");
    return flags.includes(featureFlag);
  }
  return false;
}

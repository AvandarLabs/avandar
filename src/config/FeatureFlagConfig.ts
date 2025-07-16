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
}

export const FeatureFlagConfig = {
  [FeatureFlag.DisableSelfRegistration]: {
    waitlistURL: "https://avandarlabs.com",
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<FeatureFlag, any>;

export function isFlagEnabled(featureFlag: FeatureFlag): boolean {
  const envFlagsStr = import.meta.env.VITE_FEATURE_FLAGS;
  if (envFlagsStr && typeof envFlagsStr === "string") {
    const flags = envFlagsStr.split(";");
    return flags.includes(featureFlag);
  }

  return false;
}

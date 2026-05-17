/**
 * Read a Vite env feature flag as a boolean. The flag is sourced from
 * `import.meta.env.VITE_FEATURE_<name>`. Defaults to `false` whenever the
 * env var is unset, missing, or has any value other than `"true"` / `"1"`.
 */
export function getFeatureFlag(name: string): boolean {
  const raw = import.meta.env[`VITE_FEATURE_${name}`];
  return raw === "true" || raw === "1";
}

/**
 * Whether the new Drive-style share modal (`SHARE_MODAL_V2`) is enabled.
 * Controlled by `VITE_FEATURE_SHARE_MODAL_V2`. Defaults to OFF.
 */
export function isShareModalV2Enabled(): boolean {
  return getFeatureFlag("SHARE_MODAL_V2");
}

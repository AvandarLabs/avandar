import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";

/** Where a plugin stands in a workspace. */
export type PluginInstallStatus =
  | "not_installed"
  | "installed"
  | "disabled"
  | "needs_review"
  | "unavailable";

/**
 * Derives a plugin's status in a workspace, for example to decide whether the
 * Plugins settings tab offers Install, Enable, or Review. `manifestPermissions`
 * is undefined when this deployment no longer bundles the plugin.
 */
export function getPluginInstallStatusFromInstallation(options: {
  installation:
    | Pick<PluginInstallation.T, "isEnabled" | "grantedPermissions">
    | undefined;
  manifestPermissions: readonly string[] | undefined;
}): PluginInstallStatus {
  const { installation, manifestPermissions } = options;
  if (installation === undefined) {
    return "not_installed";
  }
  if (manifestPermissions === undefined) {
    return "unavailable";
  }
  if (!installation.isEnabled) {
    return "disabled";
  }
  const hasUngrantedPermission = manifestPermissions.some((permission) => {
    return !installation.grantedPermissions.includes(permission);
  });
  return hasUngrantedPermission ? "needs_review" : "installed";
}

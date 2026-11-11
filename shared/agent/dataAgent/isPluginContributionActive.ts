/**
 * Whether a plugin's contributions, such as its data-agent tools, are live in
 * a workspace: the plugin is enabled and the workspace has granted every
 * permission its manifest requests.
 *
 * Use it wherever a workspace's installation decides if a plugin may act, for
 * example when showing install status or offering tools to a model.
 */
export function isPluginContributionActive(options: {
  isEnabled: boolean;
  grantedPermissions: readonly string[];
  manifestPermissions: readonly string[];
}): boolean {
  const { isEnabled, grantedPermissions, manifestPermissions } = options;
  return (
    isEnabled &&
    manifestPermissions.every((permission) => {
      return grantedPermissions.includes(permission);
    })
  );
}

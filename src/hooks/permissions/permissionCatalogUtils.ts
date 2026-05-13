import { Permissions } from "$/models/Permissions/Permissions";
import type {
  AppType,
  RoleLevel,
} from "$/models/Permissions/Permissions.types";

const APPS: readonly AppType[] = [
  "data_sources",
  "data_explorer",
  "dashboards",
  "settings",
];

/**
 * Returns every catalog permission key granted to `role` in `app`.
 */
export function getGrantedPermissionKeysForAppRole(options: {
  app: AppType;
  role: RoleLevel;
}): ReadonlySet<Permissions.PermissionKey> {
  const catalog = Permissions.PermissionCatalog[options.app];
  const ordered: readonly RoleLevel[] = ["viewer", "editor", "admin"];
  const maxIdx = ordered.indexOf(options.role);
  const keys = new Set<Permissions.PermissionKey>();

  for (let i = 0; i <= maxIdx; i++) {
    const tier = ordered[i];
    if (tier === undefined) {
      continue;
    }
    for (const key of catalog[tier]) {
      keys.add(key);
    }
  }

  return keys;
}

/**
 * Resolves which app a permission key belongs to.
 *
 * @returns Matching app, or undefined when the prefix is unknown.
 */
export function parseAppTypeFromPermissionKey(
  permissionKey: Permissions.PermissionKey,
): AppType | undefined {
  for (const app of APPS) {
    const prefix = `${app}__`;
    if (permissionKey.startsWith(prefix)) {
      return app;
    }
  }

  return undefined;
}

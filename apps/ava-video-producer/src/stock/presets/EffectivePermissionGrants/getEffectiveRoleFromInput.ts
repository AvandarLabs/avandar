import { PermissionRoles, type PermissionRole } from "./PermissionRoles";
import type { Input } from "./EffectivePermissionGrants.schema";
/** Maximum surviving role, excluding defaults only when restricted. */
export function getEffectiveRoleFromInput(
  input: Readonly<Input>,
): PermissionRole {
  return input.grants.reduce<PermissionRole>((role, grant) => {
    const isExcluded =
      !grant.eligible || (input.restricted && grant.kind === "app-default");
    return !isExcluded &&
      PermissionRoles.rank[grant.role] > PermissionRoles.rank[role]
      ? grant.role
      : role;
  }, "none");
}

import type { Input } from "./EffectivePermissionGrants.schema";
/** Rank order is independent of authored grant order or wording. */
export const ROLE_RANK = { none: 0, viewer: 1, editor: 2, admin: 3 } as const;
/** Maximum surviving role, excluding defaults only when restricted. */
export function getEffectiveRoleFromInput(
  input: Readonly<Input>,
): "none" | "viewer" | "editor" | "admin" {
  return input.grants.reduce<keyof typeof ROLE_RANK>((role, grant) => {
    const isExcluded =
      !grant.eligible || (input.restricted && grant.kind === "app-default");
    return !isExcluded && ROLE_RANK[grant.role] > ROLE_RANK[role]
      ? grant.role
      : role;
  }, "none");
}

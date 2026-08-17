import { useLingui } from "@lingui/react/macro";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions";

const _ROLE_RANK = {
  viewer: 1,
  editor: 2,
  admin: 3,
} as const satisfies Record<RoleLevel, number>;

type ShareButtonState = {
  isDisabled: boolean;
  tooltip: string;
  /**
   * Whether the user may write share rows. Always the `admin` bar, even when
   * the button opens at a lower one.
   */
  canManageShares: boolean;
  /**
   * Whether the role answer is still in flight. `canManageShares` is `false`
   * until it lands, so a surface that renders differently for an admin must
   * wait rather than draw the read-only form and flip.
   */
  isLoadingRole: boolean;
};

function _hasAtLeastRole(
  options: Readonly<{ role: RoleLevel | undefined; minRole: RoleLevel }>,
): boolean {
  const { role, minRole } = options;
  return role !== undefined ? _ROLE_RANK[role] >= _ROLE_RANK[minRole] : false;
}

/**
 * Whether the current user may open the share modal for a resource, with the
 * tooltip explaining a refusal.
 *
 * `minRole` defaults to `admin` because managing shares is stricter than
 * editing the resource. Dashboards pass `editor` so publishing to your own
 * workspace stays ordinary editor work; the modal still withholds the
 * share-writing controls through `canManageShares`.
 */
export function useShareButtonState(
  options: Readonly<{
    resourceType: ResourceType;
    resourceId: string | undefined;
    minRole?: RoleLevel;
  }>,
): ShareButtonState {
  const { t } = useLingui();
  const minRole = options.minRole ?? "admin";
  const [effectiveRole, isLoadingRole] = useResourceRole(options);
  const isAllowed = _hasAtLeastRole({
    role: effectiveRole ?? undefined,
    minRole,
  });
  const resourceLabel = resourceTypeLabel(options.resourceType);
  return {
    isDisabled: !options.resourceId || isLoadingRole || !isAllowed,
    canManageShares: _hasAtLeastRole({
      role: effectiveRole ?? undefined,
      minRole: "admin",
    }),
    isLoadingRole,
    tooltip:
      isAllowed || isLoadingRole ?
        minRole === "admin" ?
          t`Share this ${resourceLabel}`
        : t`Share or publish this ${resourceLabel}`
      : minRole === "admin" ?
        t`You need admin access on this resource to manage sharing.`
      : t`You need edit access on this resource to share or publish it.`,
  };
}

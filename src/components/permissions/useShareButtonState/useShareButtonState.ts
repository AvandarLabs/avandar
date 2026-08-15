import { useLingui } from "@lingui/react/macro";
import { resourceTypeLabel } from "$/copy/resourceTypeLabel";
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";

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
   * the button itself opens at a lower one, because a dashboard editor may
   * publish without being allowed to hand out access.
   */
  canManageShares: boolean;
};

function _hasAtLeastRole(
  role: RoleLevel | null | undefined,
  minRole: RoleLevel,
): boolean {
  return role !== null && role !== undefined ?
      _ROLE_RANK[role] >= _ROLE_RANK[minRole]
    : false;
}

/**
 * The "may I open the share modal" gate, shared by the generic share button and
 * the dashboard one so the role rule lives in one place.
 *
 * `minRole` defaults to `admin` because managing shares is admin-tier work,
 * stricter than editing the resource. Dashboards pass `editor` instead:
 * publishing to your own workspace is ordinary editor work, and the modal
 * disables the share-writing controls on its own via `canManageShares`.
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
  const isAllowed = _hasAtLeastRole(effectiveRole, minRole);
  const resourceLabel = resourceTypeLabel(options.resourceType);
  return {
    isDisabled: !options.resourceId || isLoadingRole || !isAllowed,
    canManageShares: _hasAtLeastRole(effectiveRole, "admin"),
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

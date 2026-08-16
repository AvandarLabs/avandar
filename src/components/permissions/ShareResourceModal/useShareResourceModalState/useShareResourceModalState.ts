import { makeObject, propEq, propNotEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { isShareableDashboardLimitError } from "@/utils/isShareableDashboardLimitError/isShareableDashboardLimitError";
import { notifyError } from "@/utils/notifications/notify";
import { buildShareSummary } from "../buildShareSummary/buildShareSummary";
import { useGeneralAccessControl } from "../useGeneralAccessControl";
import { makeDisplaySharesFromSharingState } from "./makeDisplaySharesFromSharingState";
import type { SummarySpan } from "../buildShareSummary/buildShareSummary";
import type { DisplayShare } from "../SharePrincipalList";
import type { ShareResourcePublishing } from "../ShareResourceModal.types";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

/** One entry in the "add a person or group" combobox. */
type PrincipalOption = { value: string; label: string };

type AddPrincipalSelection = {
  principalType: "user" | "user_group";
  principalId: string;
  role: RoleLevel;
};

export type ShareResourceModalState = {
  /**
   * True until the sharing rows AND both principal lookups have landed. Every
   * row's label comes from those lookups, so rendering earlier would flash
   * placeholder names and an incomplete Add list.
   */
  isLoading: boolean;
  generalAccess: ReturnType<typeof useGeneralAccessControl>;
  /** `null` when no workspace-wide share row exists. */
  workspaceShareRole: RoleLevel | null;
  memberOptions: PrincipalOption[];
  groupOptions: PrincipalOption[];
  isAddingPrincipal: boolean;
  /** Owner first, then users, then groups; each alphabetical. */
  displayShares: DisplayShare[];
  summarySpans: SummarySpan[];
  onAddPrincipal: (selection: AddPrincipalSelection) => void;
  onRoleChange: (share: DisplayShare, role: RoleLevel) => void;
  onToggleRequiresAppAccess: (share: DisplayShare, next: boolean) => void;
  onRemoveShare: (share: DisplayShare) => void;
};

/**
 * Every query, mutation and derived list behind `ShareResourceModal`.
 *
 * Kept out of the component so the component is composition only: this hook
 * holds four reads, three writes with their error handling, the two principal
 * lookups the row labels come from, and the general-access wiring.
 */
export function useShareResourceModalState(
  options: Readonly<{
    resourceName: string;
    resourceType: ResourceType;
    resourceId: string;
    publishing: ShareResourcePublishing | undefined;
  }>,
): ShareResourceModalState {
  const { resourceName, resourceType, resourceId, publishing } = options;
  const { t, i18n } = useLingui();
  const workspace = useCurrentWorkspace();
  const workspaceId = workspace.id as WorkspaceId;

  const queryKey = ResourceShareClient.QueryKeys.getResourceSharingState({
    workspaceId,
    resourceType,
    resourceId,
  });
  const invalidateKeys = [queryKey];

  const [sharingState, isLoadingState, sharingStateQuery] =
    ResourceShareClient.useGetResourceSharingState({
      workspaceId,
      resourceType,
      resourceId,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const workspaceShare = sharingState?.shares.find(
    propEq("principalType", "workspace"),
  );

  const [members, isLoadingMembers] = WorkspaceClient.useGetUsersForWorkspace({
    workspaceId,
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });
  const [userGroups, isLoadingUserGroups] = PermissionsClient.useGetUserGroups({
    workspaceId,
    useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
  });

  const [upsertShare, isUpserting] = ResourceShareClient.useUpsertResourceShare(
    {
      queriesToInvalidate: invalidateKeys,
      onError: (error: Error) => {
        // Adding the first non-owner reader to a published, self-only
        // dashboard makes it reachable by somebody else, which is exactly what
        // the plan caps. Nothing gates this write in the UI, so the database
        // trigger is where the user meets the limit, and the generic message
        // would leave them with no idea why.
        //
        // A toast rather than the upgrade modal: the person is in the middle
        // of handing out access, and the design puts the upgrade offer on the
        // publish action, which is where the limit is actually about to be
        // spent.
        if (isShareableDashboardLimitError(error)) {
          notifyError({
            title: t`Shared dashboard limit reached`,
            message: t`Your plan does not allow sharing this dashboard with anyone else. Upgrade your plan, or unshare another dashboard, and try again.`,
          });
          return;
        }
        notifyError({ title: t`Share failed`, message: error.message });
      },
    },
  );

  const [deleteShare] = ResourceShareClient.useDeleteResourceShare({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({ title: t`Remove failed`, message: error.message });
    },
  });

  const [setRestricted] = ResourceShareClient.useSetResourceRestricted({
    queriesToInvalidate: invalidateKeys,
    onError: (error: Error) => {
      notifyError({
        title: t`Restriction update failed`,
        message: error.message,
      });
    },
  });

  const generalAccess = useGeneralAccessControl({
    resourceName,
    resourceType,
    resourceId,
    workspaceId,
    sharingState,
    workspaceShare,
    queryKey,
    isSharingStateFetching: sharingStateQuery.isFetching,
    upsertShare,
    deleteShare,
    setRestricted,
    // Two flags, deliberately not one. The dropdown follows the PENDING
    // target so a pick does not snap back mid-request; the "Make private"
    // warning follows what is PUBLISHED, because revoking shares leaves a
    // public dashboard world-readable no matter what the dropdown now says.
    isPublicPublishTargeted: publishing?.targetVisibility === "public",
    isPubliclyPublished: publishing?.currentVisibility === "public",
  });

  const userById = useMemo((): Record<string, string> => {
    return makeObject(members ?? [], {
      key: "userId",
      valueFn: (member): string => {
        return member.displayName || member.fullName;
      },
    });
  }, [members]);

  const groupById = useMemo((): Record<string, string> => {
    return makeObject(userGroups ?? [], { key: "id", valueKey: "name" });
  }, [userGroups]);

  // Excludes the workspace-wide row (the dropdown owns that one) and any
  // explicit share for the owner, which the read-only Owner row shadows.
  const directShares = (sharingState?.shares ?? [])
    .filter(propNotEq("principalType", "workspace"))
    .filter((share) => {
      return !(
        share.principalType === "user" &&
        share.principalId === sharingState?.ownerId
      );
    });

  const displayShares =
    sharingState ?
      makeDisplaySharesFromSharingState({
        sharingState,
        resourceType,
        resourceId,
        workspaceId,
        directShares,
        userById,
        groupById,
        members,
        i18n,
      })
    : [];

  const summarySpans =
    sharingState ?
      buildShareSummary({
        shares: directShares,
        isRestricted: sharingState.isRestricted,
        workspaceShareRole: workspaceShare?.role ?? null,
        resourceType,
        workspaceName: workspace.name,
        userById,
        groupById,
        // The persisted value, not the target: this sentence states what IS
        // true of the resource. A draft whose owner has just picked "Anyone
        // with the link" is not published on the web, and saying so would be
        // false reassurance. The pending change is reported by the status
        // alert, which exists to say exactly that.
        publication: publishing ? publishing.currentVisibility : undefined,
      })
    : [];

  return {
    isLoading:
      isLoadingState ||
      !sharingState ||
      isLoadingMembers ||
      isLoadingUserGroups,
    generalAccess,
    workspaceShareRole: workspaceShare?.role ?? null,
    memberOptions: (members ?? []).map((member) => {
      return {
        value: member.userId,
        label: member.displayName || member.fullName,
      };
    }),
    groupOptions: (userGroups ?? []).map((group) => {
      return { value: group.id, label: group.name };
    }),
    isAddingPrincipal: isUpserting,
    displayShares,
    summarySpans,
    onAddPrincipal: ({ principalType, principalId, role }) => {
      upsertShare({
        workspaceId,
        resourceType,
        resourceId,
        principalType,
        principalId,
        role,
        requiresAppAccess: false,
      });
    },
    onRoleChange: (share, role) => {
      if (share.isOwnerRow) {
        return;
      }
      upsertShare({
        workspaceId,
        resourceType,
        resourceId,
        principalType: share.principalType,
        principalId: share.principalId,
        role,
        requiresAppAccess: share.requiresAppAccess,
      });
    },
    onToggleRequiresAppAccess: (share, next) => {
      if (share.isOwnerRow || share.principalType !== "user_group") {
        return;
      }
      upsertShare({
        workspaceId,
        resourceType,
        resourceId,
        principalType: share.principalType,
        principalId: share.principalId,
        role: share.role,
        requiresAppAccess: next,
      });
    },
    onRemoveShare: (share) => {
      if (share.isOwnerRow) {
        return;
      }
      deleteShare({ shareId: share.id });
    },
  };
}

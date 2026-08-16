import { makeObject, propEq, propNotEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { buildShareSummary } from "../buildShareSummary/buildShareSummary";
import { useGeneralAccessControl } from "../useGeneralAccessControl";
import { makeDisplaySharesFromSharingState } from "./makeDisplaySharesFromSharingState";
import { makeShareRowCallbacks } from "./makeShareRowCallbacks";
import { useResourceShareMutations } from "./useResourceShareMutations";
import type { SummarySpan } from "../buildShareSummary/buildShareSummary";
import type { DisplayShare } from "../SharePrincipalList";
import type { ShareResourcePublishing } from "../ShareResourceModal.types";
import type { ShareRowCallbacks } from "./makeShareRowCallbacks";
import type { ResourceType } from "@/clients/permissions/ResourceShareClient";
import type { RoleLevel } from "$/models/Permissions/Permissions.types";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types";

/** One entry in the "add a person or group" combobox. */
type PrincipalOption = { value: string; label: string };

export type ShareResourceModalState = ShareRowCallbacks & {
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
  const { i18n } = useLingui();
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

  const mutations = useResourceShareMutations(invalidateKeys);

  const generalAccess = useGeneralAccessControl({
    resourceName,
    resourceType,
    resourceId,
    workspaceId,
    sharingState,
    workspaceShare,
    queryKey,
    isSharingStateFetching: sharingStateQuery.isFetching,
    upsertShare: mutations.upsertShare,
    deleteShare: mutations.deleteShare,
    setRestricted: mutations.setRestricted,
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
    isAddingPrincipal: mutations.isUpserting,
    displayShares,
    summarySpans,
    ...makeShareRowCallbacks({
      workspaceId,
      resourceType,
      resourceId,
      mutations,
    }),
  };
}

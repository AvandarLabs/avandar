import { matchLiteral, propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { appLabel } from "$/copy/appLabel";
import { ResourceShareClient } from "@/clients/permissions/ResourceShareClient";
import { useCurrentUser } from "@/hooks/users/useCurrentUser";
import { notifyError } from "@/utils/notifications/notify";
import { GeneralAccessModule } from "./GeneralAccessModule/GeneralAccessModule";
import { getAppTypeFromResourceType } from "./getAppTypeFromResourceType/getAppTypeFromResourceType";
import { openMakePrivateConfirmModal } from "./openMakePrivateConfirmModal";
import type { RoleLevel } from "$/models/Permissions/Permissions";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { GeneralAccessValue } from "./GeneralAccessModule/GeneralAccessModule";
import type {
  ResourceShareRow,
  ResourceSharingState,
  ResourceType,
} from "@/clients/permissions/ResourceShareClient";

type UseGeneralAccessControlOptions = {
  resourceName: string;
  resourceType: ResourceType;
  resourceId: string;
  workspaceId: Workspace.Id;
  sharingState: ResourceSharingState | undefined;
  workspaceShare: ResourceShareRow | undefined;
  queryKey: ReturnType<
    typeof ResourceShareClient.QueryKeys.getResourceSharingState
  >;
  isSharingStateFetching: boolean;
  upsertShare: (
    options: Parameters<typeof ResourceShareClient.upsertResourceShare>[0],
  ) => void;
  deleteShare: (
    options: Parameters<typeof ResourceShareClient.deleteResourceShare>[0],
  ) => void;
  setRestricted: (
    options: Parameters<typeof ResourceShareClient.setResourceRestricted>[0],
  ) => void;
  /**
   * Whether "Anyone with the link" is the PENDING selection. Display only, so
   * the pick does not snap back while a publish is in flight. `false` for
   * resource types with no published form.
   */
  isPublicPublishTargeted: boolean;
  /**
   * Whether the resource is publicly published RIGHT NOW. Only this may drive
   * a warning about real exposure, such as the "Make private" confirmation.
   *
   * Separate from `isPublicPublishTargeted` because the two disagree in both
   * directions: a draft merely selected as public would raise a false alarm,
   * and a live public dashboard since selected "Restricted" would suppress the
   * alarm that matters.
   */
  isPubliclyPublished: boolean;
};

type GeneralAccessControl = {
  displayedValue: GeneralAccessValue;
  isOwner: boolean;
  isBusy: boolean;
  onChange: (value: GeneralAccessValue) => void;
  onWorkspaceRoleChange: (role: RoleLevel) => void;
};

type GeneralAccessActions = UseGeneralAccessControlOptions & {
  derivedValue: GeneralAccessValue;
  displayedValue: GeneralAccessValue;
  isOwner: boolean;
  makePrivate: (
    options: Parameters<typeof ResourceShareClient.makeResourcePrivate>[0],
  ) => void;
  setWantsRestricted: (value: boolean) => void;
};

function _getShareCounts(sharingState: ResourceSharingState): {
  numUsers: number;
  numGroups: number;
} {
  const nonOwnerShares = sharingState.shares.filter((share) => {
    return !(
      share.principalType === "user" &&
      share.principalId === sharingState.ownerId
    );
  });
  return {
    numUsers: nonOwnerShares.filter(propEq("principalType", "user")).length,
    numGroups: nonOwnerShares.filter(propEq("principalType", "user_group"))
      .length,
  };
}

function _requestMakePrivate(options: Readonly<GeneralAccessActions>): void {
  const { sharingState } = options;
  if (!sharingState || !options.isOwner) {
    return;
  }
  if (options.derivedValue === "private") {
    options.setWantsRestricted(false);
    return;
  }

  const { numUsers, numGroups } = _getShareCounts(sharingState);
  const losesWorkspaceAccess =
    !sharingState.isRestricted || options.workspaceShare !== undefined;
  const mutationOptions = {
    resourceType: options.resourceType,
    resourceId: options.resourceId,
  } as const;
  if (numUsers + numGroups === 0 && !losesWorkspaceAccess) {
    options.makePrivate(mutationOptions);
    return;
  }
  openMakePrivateConfirmModal({
    resourceName: options.resourceName,
    app: appLabel(getAppTypeFromResourceType(options.resourceType)),
    numUsers,
    numGroups,
    losesWorkspaceAccess,
    isPubliclyPublished: options.isPubliclyPublished,
    onConfirm: () => {
      options.makePrivate(mutationOptions);
    },
  });
}

function _applyRestrictedAccess(options: Readonly<GeneralAccessActions>): void {
  const { sharingState } = options;
  if (!sharingState) {
    return;
  }
  options.setWantsRestricted(true);
  if (sharingState.isRestricted) {
    return;
  }
  options.setRestricted({
    workspaceId: options.workspaceId,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    isRestricted: true,
  });
  if (options.workspaceShare) {
    options.deleteShare({ shareId: options.workspaceShare.id });
  }
}

function _applyWorkspaceAccess(options: Readonly<GeneralAccessActions>): void {
  const { sharingState } = options;
  if (!sharingState) {
    return;
  }
  options.setWantsRestricted(false);
  if (sharingState.isRestricted) {
    options.setRestricted({
      workspaceId: options.workspaceId,
      resourceType: options.resourceType,
      resourceId: options.resourceId,
      isRestricted: false,
    });
  }
  options.upsertShare({
    workspaceId: options.workspaceId,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    principalType: "workspace",
    principalId: null,
    role: options.workspaceShare?.role ?? "viewer",
  });
}

function _applyGeneralAccessChange(
  options: Readonly<{
    actions: Readonly<GeneralAccessActions>;
    value: GeneralAccessValue;
  }>,
): void {
  if (options.value === options.actions.displayedValue) {
    return;
  }
  matchLiteral(options.value, {
    private: () => {
      _requestMakePrivate(options.actions);
    },
    restricted: () => {
      _applyRestrictedAccess(options.actions);
    },
    workspace: () => {
      _applyWorkspaceAccess(options.actions);
    },
    public: () => {
      // Public reads never consult `resource_shares`, so selecting this writes
      // no share rows: the anon policy and the `is_public` short-circuit in
      // util__auth_user_may_select_dashboard both fire first. Rewriting shares
      // here would widen EDIT access as a side effect of a READ decision, and
      // would destroy the narrowing the owner gets back on a downgrade.
    },
  });
}

function _applyWorkspaceRole(
  options: Readonly<{
    actions: Readonly<GeneralAccessActions>;
    role: RoleLevel;
  }>,
): void {
  if (options.role === options.actions.workspaceShare?.role) {
    return;
  }
  options.actions.upsertShare({
    workspaceId: options.actions.workspaceId,
    resourceType: options.actions.resourceType,
    resourceId: options.actions.resourceId,
    principalType: "workspace",
    principalId: null,
    role: options.role,
  });
}

function _createGeneralAccessControl(
  options: Readonly<{
    actions: Readonly<GeneralAccessActions>;
    isBusy: boolean;
  }>,
): GeneralAccessControl {
  return {
    displayedValue: options.actions.displayedValue,
    isOwner: options.actions.isOwner,
    isBusy: options.isBusy,
    onChange: (value) => {
      return _applyGeneralAccessChange({ actions: options.actions, value });
    },
    onWorkspaceRoleChange: (role) => {
      return _applyWorkspaceRole({ actions: options.actions, role });
    },
  };
}

/** Coordinates persisted and intent-only General access changes. */
export function useGeneralAccessControl(
  options: Readonly<UseGeneralAccessControlOptions>,
): GeneralAccessControl {
  const { t } = useLingui();
  const currentUser = useCurrentUser();
  const [wantsRestricted, setWantsRestricted] = useState(false);
  const [makePrivate, isMakingPrivate] =
    ResourceShareClient.useMakeResourcePrivate({
      queriesToInvalidate: [options.queryKey],
      onError: () => {
        notifyError({
          title: t`Could not make private`,
          message: t`Please try again.`,
        });
      },
      onSuccess: () => {
        setWantsRestricted(false);
      },
    });
  const derivedValue = options.sharingState
    ? GeneralAccessModule.fromResourceState({
        ...options.sharingState,
        isPublicSelected: options.isPublicPublishTargeted,
      })
    : "private";
  const displayedValue =
    derivedValue === "private" && wantsRestricted ? "restricted" : derivedValue;
  const actionOptions = {
    ...options,
    derivedValue,
    displayedValue,
    isOwner:
      currentUser?.id !== undefined &&
      options.sharingState?.ownerId === currentUser.id,
    makePrivate,
    setWantsRestricted,
  };
  return _createGeneralAccessControl({
    actions: actionOptions,
    isBusy: isMakingPrivate || options.isSharingStateFetching,
  });
}

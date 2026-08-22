import { useLingui } from "@lingui/react/macro";
import { useState } from "react";

import { PrivateResourceAdminClient } from "@/clients/permissions/PrivateResourceAdminClient/PrivateResourceAdminClient";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";

type OwnerOption = { value: string; label: string };

type ReassignOwnerModalState = {
  isFetchingMembers: boolean;
  isTransferring: boolean;
  onChangeOwner: (userId: string | null) => void;
  onTransfer: () => void;
  ownerOptions: OwnerOption[];
  toUserId: string | undefined;
};

function _buildOwnerOptions({
  members,
  fromUserId,
}: Readonly<{
  members: ReadonlyArray<{
    userId: string;
    displayName: string;
    fullName: string;
  }>;
  fromUserId: string;
}>): OwnerOption[] {
  return members
    .filter((member) => {
      return member.userId !== fromUserId;
    })
    .map((member) => {
      return {
        value: member.userId,
        label: member.displayName || member.fullName,
      };
    });
}

/** Coordinates fresh member options and the bulk ownership transfer. */
export function useReassignOwnerModal(
  options: Readonly<{ fromUserId: string; onClose: () => void }>,
): ReassignOwnerModalState {
  const workspace = useCurrentWorkspace();
  const { t } = useLingui();
  const [toUserId, setToUserId] = useState<string | undefined>(undefined);
  const [members = [], , membersQuery] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const [transferAllOwnedResources, isTransferring] =
    PrivateResourceAdminClient.useTransferAllOwnedResources({
      queriesToInvalidate: [
        PrivateResourceAdminClient.QueryKeys.getPrivateResourceCounts({
          workspaceId: workspace.id,
        }),
      ],
      onSuccess: () => {
        notifySuccess(t`Ownership reassigned.`);
        options.onClose();
      },
      onError: (error: Error) => {
        notifyError({ title: t`Reassign failed`, message: error.message });
      },
    });
  const onTransfer = () => {
    if (toUserId) {
      transferAllOwnedResources({
        workspaceId: workspace.id,
        fromUserId: options.fromUserId,
        newOwnerId: toUserId,
      });
    }
  };

  return {
    isFetchingMembers: membersQuery.isFetching,
    isTransferring,
    onChangeOwner: (userId) => {
      setToUserId(userId ?? undefined);
    },
    onTransfer,
    ownerOptions: _buildOwnerOptions({
      members,
      fromUserId: options.fromUserId,
    }),
    toUserId,
  };
}

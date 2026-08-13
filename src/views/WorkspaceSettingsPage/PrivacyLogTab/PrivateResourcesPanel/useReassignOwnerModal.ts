import { useState } from "react";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { useTransferAllOwnedResources } from "./useTransferAllOwnedResources";

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
  const [toUserId, setToUserId] = useState<string | undefined>(undefined);
  const [members = [], , membersQuery] =
    WorkspaceClient.useGetUsersForWorkspace({
      workspaceId: workspace.id,
      useQueryOptions: ALWAYS_REFETCH_ON_MOUNT,
    });
  const [transferAllOwnedResources, isTransferring] =
    useTransferAllOwnedResources({
      workspaceId: workspace.id,
      onClose: options.onClose,
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

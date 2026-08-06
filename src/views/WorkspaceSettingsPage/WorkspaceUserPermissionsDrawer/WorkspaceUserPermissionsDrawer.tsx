import { useLingui } from "@lingui/react/macro";
import { Center, Drawer, Loader, Title } from "@mantine/core";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
import { ALWAYS_REFETCH_ON_MOUNT } from "@/config/queryOptions.constants";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceMemberPermissionsEditor } from "@/views/WorkspaceSettingsPage/WorkspaceUserPermissionsDrawer/WorkspaceMemberPermissionsEditor";
import type { RoleGroupWithMatrix } from "@/clients/permissions/PermissionsClient";
import type { WorkspaceMemberProfile } from "$/models/User/UserProfile.types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  member: WorkspaceMemberProfile | null;
  roleGroups: readonly RoleGroupWithMatrix[];
};

/**
 * Drawer for editing a member’s role preset / per-app matrix and tags.
 */
export function WorkspaceUserPermissionsDrawer({
  isOpen,
  onClose,
  member,
  roleGroups,
}: Props): JSX.Element | null {
  const { t } = useLingui();
  const workspace = useCurrentWorkspace();

  const [remoteMatrix, remoteMatrixLoading] =
    PermissionsClient.useGetMemberAppRoles({
      workspaceId: workspace.id,
      userId: member?.userId,
      useQueryOptions: {
        enabled: isOpen && member !== null,
      },
    });

  const [userGroups = [], , userGroupsQuery] =
    PermissionsClient.useGetUserGroups({
      workspaceId: workspace.id,
      useQueryOptions: { ...ALWAYS_REFETCH_ON_MOUNT, enabled: isOpen },
    });

  const isEditorReady =
    member !== null && !remoteMatrixLoading && remoteMatrix !== undefined;

  return (
    <Drawer
      opened={isOpen}
      onClose={onClose}
      title={
        member ?
          <Title order={4}>{t`Edit access for ${member.displayName}`}</Title>
        : null
      }
      position="right"
      size="lg"
    >
      {member ?
        isEditorReady ?
          <WorkspaceMemberPermissionsEditor
            key={member.userId}
            member={member}
            initialMatrix={remoteMatrix}
            initialTagIds={member.tags.map((tag) => {
              return tag.id;
            })}
            userGroups={userGroups}
            // `isFetching`, not `isLoading`: a restored persisted cache
            // renders immediately while the mount refetch is still in
            // flight, and picking from a list that is about to change
            // would drop groups the member should keep.
            userGroupsFetching={userGroupsQuery.isFetching}
            roleGroups={roleGroups}
            workspaceId={workspace.id}
            onClose={onClose}
          />
        : <Center py="xl">
            <Loader />
          </Center>

      : null}
    </Drawer>
  );
}

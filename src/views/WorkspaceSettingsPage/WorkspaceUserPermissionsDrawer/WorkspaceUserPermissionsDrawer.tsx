import { useLingui } from "@lingui/react/macro";
import { Center, Drawer, Loader, Title } from "@mantine/core";
import { PermissionsClient } from "@/clients/permissions/PermissionsClient";
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

  const [userGroups = [], userGroupsLoading] =
    PermissionsClient.useGetUserGroups({
      workspaceId: workspace.id,
      useQueryOptions: { enabled: isOpen },
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
            userGroupsLoading={userGroupsLoading}
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

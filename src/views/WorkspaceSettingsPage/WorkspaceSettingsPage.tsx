import { Container, Stack, Tabs, Text, Title } from "@mantine/core";
import { notifyError, notifySuccess } from "@ui";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { WorkspaceRolesTab } from "./WorkspaceRolesTab/WorkspaceRolesTab";
import { WorkspaceTagsTab } from "./WorkspaceTagsTab/WorkspaceTagsTab";
import { WorkspaceUsersTab } from "./WorkspaceUsersTab/WorkspaceUsersTab";

export function WorkspaceSettingsPage(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();
  const isSettingsAdmin = useIsGlobalAdmin();

  const [saveWorkspace, isWorkspaceSaving] = WorkspaceClient.useUpdate({
    onSuccess: () => {
      notifySuccess({
        title: "Workspace name updated",
        message: "The workspace name was saved successfully.",
      });
    },
    onError: (error: Error) => {
      notifyError({
        title: "Failed to update workspace name",
        message: error.message,
      });
    },
  });

  const isCurrentUserTheWorkspaceOwner =
    workspace.ownerId === userProfile?.userId;

  if (!isSettingsAdmin) {
    return (
      <AppLayout title="Settings">
        <Container py="xxxl" size="xl">
          <Title order={3}>Access denied</Title>
          <Text mt="md" c="dimmed">
            Only workspace settings administrators can open workspace settings.
          </Text>
        </Container>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Settings">
      <Container py="xxxl" size="xl">
        <Stack>
          <Title order={2}>Workspace Settings</Title>
          <Tabs defaultValue="general">
            <Tabs.List>
              <Tabs.Tab value="general">General</Tabs.Tab>
              <Tabs.Tab value="users">Members</Tabs.Tab>
              <Tabs.Tab value="roles">Roles</Tabs.Tab>
              <Tabs.Tab value="tags">Tags</Tabs.Tab>
              {isCurrentUserTheWorkspaceOwner ?
                <Tabs.Tab value="billing">Billing</Tabs.Tab>
              : null}
            </Tabs.List>
            <Tabs.Panel value="general" pt="lg">
              <AvaForm
                fields={{
                  workspaceName: {
                    key: "workspaceName",
                    type: "text",
                    initialValue: workspace.name,
                    label: "Workspace Name",
                  },
                }}
                formElements={["workspaceName"]}
                disableSubmitWhileUnchanged
                buttonAlignment="right"
                submitIsLoading={isWorkspaceSaving}
                onSubmit={(values) => {
                  saveWorkspace({
                    id: workspace.id,
                    data: {
                      name: values.workspaceName,
                    },
                  });
                }}
              />
            </Tabs.Panel>
            <Tabs.Panel value="users" pt="lg">
              <WorkspaceUsersTab />
            </Tabs.Panel>
            <Tabs.Panel value="roles" pt="lg">
              <WorkspaceRolesTab />
            </Tabs.Panel>
            <Tabs.Panel value="tags" pt="lg">
              <WorkspaceTagsTab />
            </Tabs.Panel>
            {isCurrentUserTheWorkspaceOwner ?
              <Tabs.Panel value="billing" pt="lg">
                <WorkspaceBillingView />
              </Tabs.Panel>
            : null}
          </Tabs>
        </Stack>
      </Container>
    </AppLayout>
  );
}

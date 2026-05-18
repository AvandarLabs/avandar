import { Container, Text, Title } from "@mantine/core";
import { notifyError, notifySuccess, Tabs } from "@ui";
import { WorkspaceClient } from "@/clients/WorkspaceClient";
import { AvaForm } from "@/components/forms/AvaForm/AvaForm";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useIsGlobalAdmin } from "@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";
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

  const generalTabPanel = () => {
    return (
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
    );
  };

  return (
    <AppLayout title="Settings">
      <Container py="xxxl" size="xl">
        {isCurrentUserTheWorkspaceOwner ?
          <Tabs
            tabIds={["general", "users", "roles", "tags", "billing"] as const}
            renderTabHeader={{
              general: "General",
              users: "Members",
              roles: "Roles",
              tags: "Tags",
              billing: "Billing",
            }}
            renderTabPanel={{
              general: generalTabPanel,
              users: () => {
                return <WorkspaceUsersTab />;
              },
              roles: () => {
                return <WorkspaceRolesTab />;
              },
              tags: () => {
                return <WorkspaceTagsTab />;
              },
              billing: () => {
                return <WorkspaceBillingView />;
              },
            }}
          />
        : <Tabs
            tabIds={["general", "users", "roles", "tags"] as const}
            renderTabHeader={{
              general: "General",
              users: "Members",
              roles: "Roles",
              tags: "Tags",
            }}
            renderTabPanel={{
              general: generalTabPanel,
              users: () => {
                return <WorkspaceUsersTab />;
              },
              roles: () => {
                return <WorkspaceRolesTab />;
              },
              tags: () => {
                return <WorkspaceTagsTab />;
              },
            }}
          />
        }
      </Container>
    </AppLayout>
  );
}

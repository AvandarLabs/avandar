import { Container, Stack, Title } from "@mantine/core";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { AvaForm } from "@/lib/ui/AvaForm/AvaForm";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { WorkspaceBillingView } from "./WorkspaceBillingView";
import { WorkspaceUsersForm } from "./WorkspaceUsersForm";

export function WorkspaceSettingsPage(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [userProfile] = useCurrentUserProfile();

  const [saveWorkspace, isWorkspaceSaving] = WorkspaceClient.useUpdate({
    onSuccess: () => {
      notifySuccess({
        title: "Workspace name updated",
        message: "The workspace name was saved successfully.",
      });
    },
    onError: (error) => {
      notifyError({
        title: "Failed to update workspace name",
        message: error.message,
      });
    },
  });

  const isCurrentUserTheWorkspaceOwner =
    workspace.ownerId === userProfile?.userId;

  return (
    <Container py="xxxl" size="xl">
      <Stack>
        <Title order={2}>Workspace Settings</Title>
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
        <Title order={3}>Workspace Users</Title>
        <WorkspaceUsersForm />
        {isCurrentUserTheWorkspaceOwner ?
          <WorkspaceBillingView />
        : null}
      </Stack>
    </Container>
  );
}

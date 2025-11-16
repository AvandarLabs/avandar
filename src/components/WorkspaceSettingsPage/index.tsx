import { Container, Stack, Title } from "@mantine/core";
import { WorkspaceUserForm } from "@/components/WorkspaceSettingsPage/WorkspaceUsersForm";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { BasicForm } from "@/lib/ui/BasicForm";
import { notifyError, notifySuccess } from "@/lib/ui/notifications/notify";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";
import { BillingView } from "./BillingView";

export function WorkspaceSettingsPage(): JSX.Element {
  const workspace = useCurrentWorkspace();

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

  return (
    <Container py="xxxl" size="xl">
      <Stack>
        <Title order={2}>Workspace Settings</Title>
        <BasicForm
          introText="Update your workspace name. Editing the slug will come later."
          fields={{
            workspaceName: {
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
        <WorkspaceUserForm />
        <BillingView />
      </Stack>
    </Container>
  );
}

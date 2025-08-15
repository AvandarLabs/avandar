import { Container, Stack, Title } from "@mantine/core";
import { useQueryClient } from "@tanstack/react-query";
import { WorkspaceUserForm } from "@/components/SettingsView/WorkspaceUsersForm";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { BasicForm } from "@/lib/ui/BasicForm";
import { notifyError } from "@/lib/ui/notifications/notifyError";
import { notifySuccess } from "@/lib/ui/notifications/notifySuccess";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export function SettingsView(): JSX.Element {
  const currentWorkspace = useCurrentWorkspace();
  const queryClient = useQueryClient();

  const [saveWorkspace, isWorkspaceSaving] = WorkspaceClient.useUpdate({
    onSuccess: (updated) => {
      queryClient.setQueryData(
        [WorkspaceClient.getClientName(), "getById", updated.id],
        updated,
      );

      queryClient.setQueryData(
        [WorkspaceClient.getClientName(), "getWorkspacesOfCurrentUser"],
        (prev: unknown) => {
          return Array.isArray(prev) ?
              prev.map((workspace) => {
                return workspace.id === updated.id ?
                    { ...workspace, name: updated.name }
                  : workspace;
              })
            : prev;
        },
      );

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
    <Container size="sm">
      <Stack>
        <Title order={2}>Workspace Settings</Title>
        <BasicForm
          introText="Update your workspace name. Editing the slug will come later."
          fields={{
            workspaceName: {
              type: "text",
              initialValue: currentWorkspace.name,
              label: "Workspace Name",
            },
          }}
          formElements={["workspaceName"]}
          disableSubmitWhileUnchanged
          buttonAlignment="right"
          submitIsLoading={isWorkspaceSaving}
          onSubmit={(values) => {
            saveWorkspace({
              id: currentWorkspace.id,
              data: { name: values.workspaceName },
            });
          }}
        />
        <WorkspaceUserForm />
      </Stack>
    </Container>
  );
}

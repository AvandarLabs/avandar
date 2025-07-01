import { Container, Divider, Paper, Stack, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { BasicForm } from "@/lib/ui/BasicForm";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { slugify } from "@/lib/utils/strings/transformations";
import { WorkspaceClient } from "@/models/Workspace/WorkspaceClient";

export const Route = createFileRoute("/_auth/")({
  component: HomePage,
});

const FORM_FIELDS = {
  workspaceName: {
    type: "text" as const,
    initialValue: "",
    required: true,
  },
  workspaceIdentifier: {
    type: "text" as const,
    description: "This is the unique ID of your organization used in URLs.",
    initialValue: "",
    required: true,
    syncWhileUntouched: {
      syncFrom: "workspaceName",
      transform: slugify,
    },
  },
  fullName: {
    type: "text" as const,
    initialValue: "",
    required: true,
  },
  displayName: {
    type: "text" as const,
    description:
      "This could be your name, a nickname, or however you want your team to refer to you.",
    initialValue: "",
    required: true,
    syncWhileUntouched: {
      syncFrom: "fullName",
    },
  },
};

const FORM_ELEMENTS = [
  <Title order={4}>About your workspace</Title>,
  "workspaceName",
  "workspaceIdentifier",
  <Divider mt="sm" mb="xs" />,
  <Title order={4}>About you</Title>,
  "fullName",
  "displayName",
] as const;

function HomePage() {
  const [createWorkspace, isWorkspaceCreating] =
    WorkspaceClient.useCreateWorkspaceWithOwner({
      onSuccess: (data) => {
        notifyDevAlert("Workspace created successfully", data);
      },
    });

  return (
    <Container py="xxxl">
      <Stack>
        <Title ta="center" order={1}>
          Welcome to your first workspace
        </Title>

        <Paper withBorder shadow="md" p="lg" mt="lg" radius="md" bg="white">
          <BasicForm
            fields={FORM_FIELDS}
            formElements={FORM_ELEMENTS}
            submitIsLoading={isWorkspaceCreating}
            onSubmit={(values) => {
              console.log(values);
              notifyDevAlert(values);
              createWorkspace({
                workspaceName: values.workspaceName,
                workspaceSlug: values.workspaceIdentifier,
                ownerName: values.fullName,
                ownerDisplayName: values.displayName,
              });
            }}
            introText="It's time to create your first workspace. Don't think for too long you can always change these later!"
          />
        </Paper>
      </Stack>
    </Container>
  );
}

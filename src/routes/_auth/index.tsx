import { Container, Paper, Stack, Title } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { BasicForm } from "@/lib/ui/BasicForm";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { slugify } from "@/lib/utils/strings/transformations";

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
    description:
      "This is the unique ID of your organization used in URLs. It cannot be changed once created.",
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

const FIELD_ORDER = [
  "workspaceName",
  "workspaceIdentifier",
  "fullName",
  "displayName",
] as const;

function HomePage() {
  return (
    <Container my="xxxl">
      <Stack>
        <Title ta="center" order={1}>
          Welcome to your first workspace
        </Title>

        <Paper withBorder shadow="md" p="lg" mt="lg" radius="md" bg="white">
          <BasicForm
            fields={FORM_FIELDS}
            fieldOrder={FIELD_ORDER}
            onSubmit={(values) => {
              console.log(values);
              notifyDevAlert(values);
            }}
          />
        </Paper>
      </Stack>
    </Container>
  );
}

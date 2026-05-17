import { Container, Text, Title } from "@mantine/core";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";

type Props = {
  appLabel?: string;
};

/**
 * Shown when a member opens a workspace app route without the required role.
 */
export function WorkspaceAppAccessDenied({ appLabel }: Props): JSX.Element {
  return (
    <AppLayout title="Access denied">
      <Container py="xxxl" size="md">
        <Title order={3}>Access denied</Title>
        <Text mt="md" c="dimmed">
          {appLabel ?
            `You do not have permission to open ${appLabel} in this workspace.`
          : "You do not have permission to open this part of the workspace."
          }{" "}
          Ask a workspace settings administrator to update your roles.
        </Text>
      </Container>
    </AppLayout>
  );
}

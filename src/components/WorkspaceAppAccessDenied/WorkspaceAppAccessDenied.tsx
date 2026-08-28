import { Trans, useLingui } from "@lingui/react/macro";
import { Container, Text, Title } from "@mantine/core";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";

type Props = {
  appLabel?: string;
};

/**
 * Shown when a member opens a workspace app route without the required role.
 */
export function WorkspaceAppAccessDenied({ appLabel }: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <AppLayout title={t`Access denied`}>
      <Container py="xxxl" size="md">
        <Title order={3}>
          <Trans>Access denied</Trans>
        </Title>
        <Text mt="md" c="dimmed">
          {appLabel
            ? t`You do not have permission to open ${appLabel} in this workspace.`
            : t`You do not have permission to open this part of the workspace.`}{" "}
          <Trans>
            Ask a workspace settings administrator to update your roles.
          </Trans>
        </Text>
      </Container>
    </AppLayout>
  );
}

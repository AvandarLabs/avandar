import { Trans } from "@lingui/react/macro";
import {
  Button,
  Container,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconDatabase, IconTable } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { mantineColorVar, Paper } from "@ui";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useIsTabletSize } from "@/lib/hooks/ui/useIsTabletSize";
import type { Workspace } from "$/models/Workspace/Workspace";

type Props = {
  workspace: Workspace.WithSubscription;
};

export function WorkspaceHomeView({ workspace }: Props): JSX.Element {
  const navigate = useNavigate();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();
  const isTabletSize = useIsTabletSize() ?? false;
  const featureIconSize = isTabletSize ? 24 : 32;

  const onGoToUploadDataset = () => {
    navigate(AppLinks.dataImport(workspace.slug));
  };

  const onGoToDataExplorer = () => {
    navigate(AppLinks.dataExplorer(workspace.slug));
  };

  return (
    <AppLayout title={workspace.name}>
      <Container ta="left" py={{ base: "xl", md: "xxl", xl: "xxxl" }} size="lg">
        <Stack gap="xl">
          <Stack gap="xs">
            <Title order={1}>
              {isLoadingUserProfile ?
                <>
                  <Trans>Welcome back</Trans>
                  <Loader ml="sm" size="sm" />
                </>
              : userProfile ?
                <Trans>Welcome back, {userProfile.displayName}</Trans>
              : <Trans>Welcome back</Trans>}
            </Title>
            <Text size="lg" c="dimmed">
              <Trans>
                Get started by exploring your workspace or uploading your first
                dataset.
              </Trans>
            </Text>
          </Stack>

          <Stack gap="md">
            <Title order={2} size="h3" fw={600}>
              <Trans>Recommended next steps</Trans>
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Paper p="lg" h="100%">
                <Stack gap="md" h="100%">
                  <Group gap="md">
                    <IconDatabase
                      size={featureIconSize}
                      stroke={1.5}
                      color={mantineColorVar("primary.6")}
                    />
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Title order={3} size="h4" fw={600}>
                        <Trans>Upload a dataset</Trans>
                      </Title>
                      <Text size="sm" c="dimmed">
                        <Trans>
                          Import spreadsheets, connect to Google Sheets, or add
                          data from other sources to start analyzing your
                          information.
                        </Trans>
                      </Text>
                    </Stack>
                  </Group>
                  <Button
                    onClick={onGoToUploadDataset}
                    variant="filled"
                    fullWidth
                    mt="auto"
                    leftSection={<IconDatabase size={18} />}
                  >
                    <Trans>Upload dataset</Trans>
                  </Button>
                </Stack>
              </Paper>

              <Paper p="lg" h="100%">
                <Stack gap="md" h="100%">
                  <Group gap="md">
                    <IconTable
                      size={featureIconSize}
                      stroke={1.5}
                      color={mantineColorVar("primary.6")}
                    />
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Title order={3} size="h4" fw={600}>
                        <Trans>Explore your data</Trans>
                      </Title>
                      <Text size="sm" c="dimmed">
                        <Trans>
                          Use the Data Explorer to analyze your datasets, create
                          visualizations, and discover insights from your data.
                        </Trans>
                      </Text>
                    </Stack>
                  </Group>
                  <Button
                    onClick={onGoToDataExplorer}
                    variant="filled"
                    fullWidth
                    mt="auto"
                    leftSection={<IconTable size={18} />}
                  >
                    <Trans>Go to Data Explorer</Trans>
                  </Button>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Stack>
      </Container>
    </AppLayout>
  );
}

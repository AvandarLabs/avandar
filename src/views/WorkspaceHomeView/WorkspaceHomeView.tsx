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
import { AppLayout } from "@/components/common/layouts/AppLayout";
import { AppLinks } from "@/config/AppLinks";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { Paper } from "@/lib/ui/Paper";
import { mantineColorVar } from "@/lib/utils/browser/css";
import { WorkspaceWithSubscription } from "@/models/Workspace/Workspace.types";

type Props = {
  workspace: WorkspaceWithSubscription;
};

export function WorkspaceHomeView({ workspace }: Props): JSX.Element {
  const navigate = useNavigate();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();

  const onGoToUploadDataset = () => {
    navigate(AppLinks.dataImport(workspace.slug));
  };

  const onGoToDataExplorer = () => {
    navigate(AppLinks.dataExplorer(workspace.slug));
  };

  return (
    <AppLayout title={workspace.name}>
      <Container ta="left" py="xxxl" size="lg">
        <Stack gap="xl">
          <Stack gap="xs">
            <Title order={1}>
              Welcome back
              {isLoadingUserProfile ?
                <Loader ml="sm" size="sm" />
              : userProfile ?
                `, ${userProfile.displayName}`
              : null}
            </Title>
            <Text size="lg" c="dimmed">
              Get started by exploring your workspace or uploading your first
              dataset.
            </Text>
          </Stack>

          <Stack gap="md">
            <Title order={2} size="h3" fw={600}>
              Recommended next steps
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Paper p="lg" h="100%">
                <Stack gap="md" h="100%">
                  <Group gap="md">
                    <IconDatabase
                      size={32}
                      stroke={1.5}
                      color={mantineColorVar("primary.6")}
                    />
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Title order={3} size="h4" fw={600}>
                        Upload a dataset
                      </Title>
                      <Text size="sm" c="dimmed">
                        Import CSV files, connect to Google Sheets, or add data
                        from other sources to start analyzing your information.
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
                    Upload dataset
                  </Button>
                </Stack>
              </Paper>

              <Paper p="lg" h="100%">
                <Stack gap="md" h="100%">
                  <Group gap="md">
                    <IconTable
                      size={32}
                      stroke={1.5}
                      color={mantineColorVar("primary.6")}
                    />
                    <Stack gap={4} style={{ flex: 1 }}>
                      <Title order={3} size="h4" fw={600}>
                        Explore your data
                      </Title>
                      <Text size="sm" c="dimmed">
                        Use the Data Explorer to analyze your datasets, create
                        visualizations, and discover insights from your data.
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
                    Go to Data Explorer
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

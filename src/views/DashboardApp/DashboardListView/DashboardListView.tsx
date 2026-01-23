import {
  Button,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconLayoutDashboard, IconPlus } from "@tabler/icons-react";
import { useNavigate } from "@tanstack/react-router";
import { DashboardClient } from "@/clients/dashboards/DashboardClient";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyDevAlert } from "@/lib/ui/notifications/notifyDevAlert";
import { Paper } from "@/lib/ui/Paper";
import { Dashboard } from "@/models/Dashboard";
import { DashboardConfigs } from "@/models/Dashboard/DashboardConfig/DashboardConfigs";
import { Models } from "@/models/Model";
import { DashboardCard } from "./DashboardCard";

type Props = {
  dashboards: Dashboard[];
  workspaceSlug: string;
};

export function DashboardListView({
  dashboards,
  workspaceSlug,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const [userProfile, isLoadingUserProfile] = useCurrentUserProfile();
  const [insertDashboard, isInsertDashboardPending] = DashboardClient.useInsert(
    {
      queryToInvalidate: DashboardClient.QueryKeys.getAll(),
      onSuccess: (createdDashboard) => {
        navigate({
          to: "/$workspaceSlug/dashboards/edit/$dashboardId",
          params: {
            workspaceSlug,
            dashboardId: createdDashboard.id,
          },
        });
      },
    },
  );

  const isEmpty = dashboards.length === 0;

  const onCreateDashboard = () => {
    if (!userProfile) {
      notifyDevAlert("User profile not loaded yet");
      return;
    }

    const now = new Date();
    insertDashboard({
      data: Models.make("Dashboard", {
        workspaceId: workspace.id,
        ownerId: userProfile.userId,
        ownerProfileId: userProfile.profileId,
        name: "Untitled dashboard",
        description: undefined,
        slug: undefined,
        isPublic: false,
        config: DashboardConfigs.makeEmpty(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }),
    });
  };

  if (isEmpty) {
    return (
      <Paper p="xxl" maw={720} mx="auto">
        <Stack gap="lg" align="center" ta="center">
          <ThemeIcon size={64} radius="xl" variant="light">
            <IconLayoutDashboard size={32} stroke={1.5} />
          </ThemeIcon>

          <Stack gap="xs">
            <Title order={2} fw={650}>
              You have not created any dashboards
            </Title>
            <Text c="dimmed">
              Create your first dashboard to track key metrics and insights.
            </Text>
          </Stack>

          <Button
            leftSection={<IconPlus size={18} />}
            onClick={onCreateDashboard}
            size="md"
            loading={isInsertDashboardPending}
            disabled={isLoadingUserProfile}
          >
            Create a dashboard
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title order={2} fw={650}>
            Dashboards
          </Title>
          <Text c="dimmed">
            {dashboards.length} dashboard{dashboards.length === 1 ? "" : "s"}
          </Text>
        </Stack>

        <Button
          leftSection={<IconPlus size={18} />}
          onClick={onCreateDashboard}
          size="md"
          variant="light"
          loading={isInsertDashboardPending}
          disabled={isLoadingUserProfile}
        >
          Create a dashboard
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
        {dashboards.map((dashboard) => {
          const onCardClick = () => {
            navigate({
              to: "/$workspaceSlug/dashboards/edit/$dashboardId",
              params: {
                workspaceSlug,
                dashboardId: dashboard.id,
              },
            });
          };

          return (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              onClick={onCardClick}
            />
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

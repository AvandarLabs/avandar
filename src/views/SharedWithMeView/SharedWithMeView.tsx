import {
  Badge,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { SharedWithMeClient } from "@/clients/permissions/SharedWithMeClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import type { SharedResource } from "@/clients/permissions/SharedWithMeClient";

type SharedDatasetSectionProps = {
  items: readonly SharedResource[];
  workspaceSlug: string;
};

type SharedDashboardSectionProps = {
  items: readonly SharedResource[];
  workspaceSlug: string;
};

/**
 * Renders the Datasets group with TanStack-router-typed deep links into the
 * data-manager dataset route. Returns null when the group is empty.
 */
function SharedDatasetSection({
  items,
  workspaceSlug,
}: SharedDatasetSectionProps): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <Stack gap="xs">
      <Title order={4}>Datasets</Title>
      <Stack gap="xs">
        {items.map((item) => {
          return (
            <Link
              key={`dataset-${item.resourceId}`}
              to="/$workspaceSlug/data-manager/$datasetId"
              params={{ workspaceSlug, datasetId: item.resourceId }}
              aria-label={item.name}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card withBorder p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={500}>{item.name}</Text>
                  <Badge variant="light" tt="capitalize">
                    {item.effectiveRole}
                  </Badge>
                </Group>
              </Card>
            </Link>
          );
        })}
      </Stack>
    </Stack>
  );
}

/**
 * Renders the Dashboards group with TanStack-router-typed deep links into the
 * dashboards editor route. Returns null when the group is empty.
 */
function SharedDashboardSection({
  items,
  workspaceSlug,
}: SharedDashboardSectionProps): JSX.Element | null {
  if (items.length === 0) {
    return null;
  }
  return (
    <Stack gap="xs">
      <Title order={4}>Dashboards</Title>
      <Stack gap="xs">
        {items.map((item) => {
          return (
            <Link
              key={`dashboard-${item.resourceId}`}
              to="/$workspaceSlug/dashboards/edit/$dashboardId"
              params={{ workspaceSlug, dashboardId: item.resourceId }}
              aria-label={item.name}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <Card withBorder p="sm">
                <Group justify="space-between" wrap="nowrap">
                  <Text fw={500}>{item.name}</Text>
                  <Badge variant="light" tt="capitalize">
                    {item.effectiveRole}
                  </Badge>
                </Group>
              </Card>
            </Link>
          );
        })}
      </Stack>
    </Stack>
  );
}

/**
 * Lists the datasets and dashboards the auth user can only reach via
 * `resource_shares` (they have no app role on the parent app for those
 * resources). Datasets and dashboards are grouped in separate sections;
 * each card deep-links into the resource via the existing parent route,
 * which now grants access through the route middleware's resourceFallback.
 */
export function SharedWithMeView(): JSX.Element {
  const workspace = useCurrentWorkspace();
  const [resources, isLoading] = SharedWithMeClient.useListSharedWithMe({
    workspaceId: workspace.id,
  });

  const datasets = (resources ?? []).filter((resource) => {
    return resource.resourceType === "dataset";
  });
  const dashboards = (resources ?? []).filter((resource) => {
    return resource.resourceType === "dashboard";
  });

  return (
    <Container py="md">
      <Stack gap="lg">
        <Title order={2}>Shared with me</Title>

        {isLoading ?
          <Loader aria-label="Loading shared resources" />
        : (resources?.length ?? 0) === 0 ?
          <Text c="dimmed">Nothing has been shared with you here.</Text>
        : <>
            <SharedDatasetSection
              items={datasets}
              workspaceSlug={workspace.slug}
            />
            <SharedDashboardSection
              items={dashboards}
              workspaceSlug={workspace.slug}
            />
          </>
        }
      </Stack>
    </Container>
  );
}

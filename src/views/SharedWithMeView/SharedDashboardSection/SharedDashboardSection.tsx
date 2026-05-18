import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { SharedResource } from "@/clients/permissions/SharedWithMeClient";

type Props = {
  items: SharedResource[];
  workspaceSlug: string;
};

/**
 * Renders the Dashboards group with TanStack-router-typed deep links into the
 * dashboards editor route. Returns null when the group is empty.
 */
export function SharedDashboardSection({
  items,
  workspaceSlug,
}: Props): JSX.Element | null {
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

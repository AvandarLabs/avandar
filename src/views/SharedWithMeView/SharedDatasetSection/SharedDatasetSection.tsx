import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { SharedResource } from "@/clients/permissions/SharedWithMeClient";

type Props = {
  items: SharedResource[];
  workspaceSlug: string;
};

/**
 * Renders the Datasets group with TanStack-router-typed deep links into the
 * data-manager dataset route. Returns null when the group is empty.
 */
export function SharedDatasetSection({
  items,
  workspaceSlug,
}: Props): JSX.Element | null {
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

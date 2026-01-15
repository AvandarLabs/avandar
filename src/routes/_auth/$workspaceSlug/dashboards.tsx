import { Container, Text } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/$workspaceSlug/dashboards")({
  component: DashboardsPage,
});

function DashboardsPage(): JSX.Element {
  return (
    <Container py="xl">
      <Text>You have no dashboards</Text>
    </Container>
  );
}


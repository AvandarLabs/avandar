import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { DashboardEditorView } from "@/views/DashboardApp/DashboardEditorView";

export const Route = createFileRoute(
  "/_auth/$workspaceSlug/dashboards/$dashboardId",
)({
  component: DashboardEditorPage,
});

function DashboardEditorPage(): JSX.Element {
  return (
    <Container py="xl">
      <DashboardEditorView />
    </Container>
  );
}


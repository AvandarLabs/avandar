import { Container } from "@mantine/core";
import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/models/Dashboard";
import { DashboardListView } from "@/views/DashboardApp/DashboardListView";

export const Route = createFileRoute("/_auth/$workspaceSlug/dashboards/")({
  component: DashboardsPage,
});

// demo data
const DEMO_DASHBOARDS: Dashboard[] = [
  {
    __type: "Dashboard",
    id: crypto.randomUUID() as Dashboard["id"],
    workspaceId: crypto.randomUUID() as Dashboard["workspaceId"],
    ownerId: crypto.randomUUID() as Dashboard["ownerId"],
    ownerProfileId: crypto.randomUUID() as Dashboard["ownerProfileId"],
    name: "Operations Overview",
    slug: "operations-overview",
    description: "A high-level view of workspace performance and trends.",
    isPublic: false,
    config: {},
    createdAt: new Date("2026-01-01T12:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-15T12:00:00.000Z").toISOString(),
  },
  {
    __type: "Dashboard",
    id: crypto.randomUUID() as Dashboard["id"],
    workspaceId: crypto.randomUUID() as Dashboard["workspaceId"],
    ownerId: crypto.randomUUID() as Dashboard["ownerId"],
    ownerProfileId: crypto.randomUUID() as Dashboard["ownerProfileId"],
    name: "Influenza Trends",
    slug: "influenza-trends",
    description: "Monitor influenza signals across datasets over time.",
    isPublic: true,
    config: {},
    createdAt: new Date("2025-12-20T12:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-10T12:00:00.000Z").toISOString(),
  },
  {
    __type: "Dashboard",
    id: crypto.randomUUID() as Dashboard["id"],
    workspaceId: crypto.randomUUID() as Dashboard["workspaceId"],
    ownerId: crypto.randomUUID() as Dashboard["ownerId"],
    ownerProfileId: crypto.randomUUID() as Dashboard["ownerProfileId"],
    name: "Workspace KPIs",
    slug: "workspace-kpis",
    description: "Track key metrics with a curated set of charts.",
    isPublic: false,
    config: {},
    createdAt: new Date("2025-11-01T12:00:00.000Z").toISOString(),
    updatedAt: new Date("2026-01-05T12:00:00.000Z").toISOString(),
  },
];

function DashboardsPage(): JSX.Element {
  const { workspaceSlug } = Route.useParams();

  return (
    <Container py="xl">
      <DashboardListView
        dashboards={DEMO_DASHBOARDS}
        workspaceSlug={workspaceSlug}
      />
    </Container>
  );
}


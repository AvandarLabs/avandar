import { Container, Loader, Stack, Text } from "@mantine/core";
import { propEq } from "@utils";
import { SharedWithMeClient } from "@/clients/permissions/SharedWithMeClient";
import { AppLayout } from "@/components/layouts/AppLayout/AppLayout";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { SharedDashboardSection } from "./SharedDashboardSection/SharedDashboardSection";
import { SharedDatasetSection } from "./SharedDatasetSection/SharedDatasetSection";

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

  const datasets = (resources ?? []).filter(propEq("resourceType", "dataset"));
  const dashboards = (resources ?? []).filter(
    propEq("resourceType", "dashboard"),
  );

  return (
    <AppLayout title="Shared with me">
      <Container py="md">
        <Stack gap="lg">
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
    </AppLayout>
  );
}

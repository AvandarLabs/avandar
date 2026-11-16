import { useQuery } from "@avandar/query-hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import { Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconMap } from "@tabler/icons-react";
import { useMemo } from "react";
import { prepareMapSnapshots } from "@/clients/dashboards/DashboardClient/dashboardSnapshotHelpers/dashboardMapSnapshots";
import { DashboardMapBlocks } from "@/clients/dashboards/DashboardMapBlocks/DashboardMapBlocks";
import { PublishMapLayersList } from "@/views/DashboardApp/DashboardShareModal/PublishMapLayersPreview/PublishMapLayersList";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { ReactNode } from "react";

type Props = { dashboard: Dashboard.T };

/**
 * Shows, before a public publish, exactly what each map will put on the web:
 * it compiles the maps the way publishing will and lists every layer with its
 * feature count.
 */
export function PublishMapLayersPreview({
  dashboard,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const mapIds = useMemo(() => {
    return DashboardMapBlocks.getMapIds(dashboard.config);
  }, [dashboard.config]);
  const [snapshots, isLoading, query] = useQuery({
    queryKey: ["publish-map-preview", dashboard],
    queryFn: async () => {
      return await prepareMapSnapshots({ dashboard, visibility: "public" });
    },
    enabled: mapIds.length > 0,
    // Each opening recompiles, so the preview matches what publishing
    // compiles even when a map's layers or data changed since last time.
    refetchOnMount: "always",
    gcTime: 0,
  });
  if (mapIds.length === 0) {
    return null;
  }
  return (
    <Stack gap="xs">
      <Group gap={6} align="center">
        <IconMap size={16} aria-hidden />
        <Title order={5} fw={600}>
          <Trans>Maps</Trans>
        </Title>
      </Group>
      <Text size="xs" c="dimmed">
        <Trans>
          Maps are published as what they show: each layer's shapes and popup
          columns, with displaced and aggregated layers already protected. The
          data behind them is not published.
        </Trans>
      </Text>
      {isLoading ? (
        <Loader size="xs" aria-label={t`Checking what each map publishes`} />
      ) : null}
      {query.isError ? (
        <Text size="xs" c="danger" role="alert">
          <Trans>
            A map could not be prepared for publishing. Open it in Maps to check
            its layers.
          </Trans>
        </Text>
      ) : null}
      {(snapshots ?? []).map((snapshot) => {
        return (
          <PublishMapLayersList key={snapshot.mapId} snapshot={snapshot} />
        );
      })}
    </Stack>
  );
}

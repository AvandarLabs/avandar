import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ReactNode, RefObject } from "react";

import { useLingui } from "@lingui/react/macro";
import { Button, Group, Loader, Text } from "@mantine/core";
import { IconZoomIn } from "@tabler/icons-react";
import { useState } from "react";

import { MapInstanceHelpers } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import css from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable.module.css";
import { ClusterFeatureTableBody } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTableBody";
import {
  CLUSTER_LEAVES_PAGE_SIZE,
  useClusterLeavesPage,
} from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/useClusterLeavesPage/useClusterLeavesPage";

type Props = {
  cluster: ClusterSelection;
  layer: MapLayer.T | undefined;
  mapRef: RefObject<MapLibreMap | undefined>;
  onRowClick: (feature: GeoJSON.Feature) => void;
};

/**
 * One page of a cluster's member features, fetched with
 * `getClusterLeaves` and paginated with native `limit`/`offset` support so a
 * cluster of hundreds of thousands of points stays cheap to browse.
 */
export function ClusterFeatureTable({
  cluster,
  layer,
  mapRef,
  onRowClick,
}: Props): ReactNode {
  const { t } = useLingui();
  const [page, setPage] = useState(1);
  const [zoomError, setZoomError] = useState(false);
  const pageState = useClusterLeavesPage({
    mapRef,
    sourceId: cluster.sourceId,
    clusterId: cluster.clusterId,
    page,
  });
  const totalPages = Math.max(
    1,
    Math.ceil(cluster.pointCount / CLUSTER_LEAVES_PAGE_SIZE),
  );

  const onZoomToCluster = (): void => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    setZoomError(false);
    MapInstanceHelpers.zoomToCluster(map, cluster).catch(() => {
      setZoomError(true);
    });
  };

  return (
    <div>
      <Group className={css.clusterFeatureTableToolbar} justify="space-between">
        <Text size="sm" c="dimmed">
          {t`${cluster.pointCount} features`}
        </Text>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconZoomIn size={14} />}
          onClick={onZoomToCluster}
        >
          {t`Zoom to cluster`}
        </Button>
      </Group>
      {zoomError ? (
        <Text c="red" size="xs" px="sm" pb="xs">
          {t`Could not zoom to this cluster.`}
        </Text>
      ) : null}
      {pageState.status === "loading" ? (
        <Group justify="center" p="md">
          <Loader role="status" aria-label={t`Loading features`} size="sm" />
        </Group>
      ) : pageState.status === "error" ? (
        <Text c="red" size="sm" p="md">
          {t`Could not load this cluster's features.`}
        </Text>
      ) : (
        <ClusterFeatureTableBody
          leaves={pageState.leaves}
          layer={layer}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={onRowClick}
        />
      )}
    </div>
  );
}

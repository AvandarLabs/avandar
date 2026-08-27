import { useLingui } from "@lingui/react/macro";
import { Button, Stack } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { CanvasDrawer } from "@/components/CanvasDrawer/CanvasDrawer";
import { ClusterFeatureTable } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable";
import { FeatureAction } from "@/views/GisApp/panels/FeatureInspector/FeatureAction";
import { FeatureFields } from "@/views/GisApp/panels/FeatureInspector/FeatureFields";
import css from "@/views/GisApp/panels/FeatureInspector/FeatureInspector.module.css";
import { FeatureInspectorHeader } from "@/views/GisApp/panels/FeatureInspector/FeatureInspectorHeader/FeatureInspectorHeader";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type { Map as MapLibreMap } from "maplibre-gl";
import type { ReactNode, RefObject } from "react";

const FEATURE_DRAWER_REGION_ID = "gis-feature-drawer-region";
const FEATURE_DRAWER_TITLE_ID = "gis-feature-drawer-title";

type Props = {
  opened: boolean;
  onClose: () => void;
  feature: GeoJSON.Feature | undefined;
  cluster: ClusterSelection | undefined;
  canvasRef: RefObject<HTMLElement | null>;
  mapRef: RefObject<MapLibreMap | undefined>;

  /** Opens the single-feature view for one row of the cluster table. */
  onRowClick: (feature: GeoJSON.Feature) => void;

  /** Returns from a drilled-into feature to its originating cluster table. */
  onBackToTable: () => void;

  /** The layer the feature or cluster came from, source of its popup config. */
  layer: MapLayer.T | undefined;
};

/**
 * Shows a cluster's member features as a table, or one selected feature's
 * fields. A feature reached by drilling into the table can return to it.
 */
export function FeatureInspector({
  opened,
  onClose,
  feature,
  cluster,
  layer,
  canvasRef,
  mapRef,
  onRowClick,
  onBackToTable,
}: Props): ReactNode {
  const { t } = useLingui();
  const popup = layer?.popup;
  const properties: Record<string, unknown> = feature?.properties ?? {};
  const showTable = cluster !== undefined && feature === undefined;
  const showBackToTable = cluster !== undefined && feature !== undefined;
  const title = showTable
    ? t`Features in cluster (${cluster.pointCount})`
    : t`Feature`;

  return (
    <CanvasDrawer opened={opened} canvasRef={canvasRef}>
      <CanvasDrawer.ResizeHandle />
      <CanvasDrawer.Body regionId={FEATURE_DRAWER_REGION_ID}>
        <div role="region" aria-labelledby={FEATURE_DRAWER_TITLE_ID}>
          <FeatureInspectorHeader
            onClose={onClose}
            titleId={FEATURE_DRAWER_TITLE_ID}
            title={title}
          />
          {showTable && cluster ? (
            <ClusterFeatureTable
              cluster={cluster}
              layer={layer}
              mapRef={mapRef}
              onRowClick={onRowClick}
            />
          ) : (
            <Stack className={css.featureInspectorBody} gap="sm">
              {showBackToTable ? (
                <Button
                  variant="subtle"
                  size="xs"
                  leftSection={<IconArrowLeft size={14} />}
                  onClick={onBackToTable}
                  style={{ alignSelf: "flex-start" }}
                >
                  {t`Back to results`}
                </Button>
              ) : null}
              <FeatureFields properties={properties} />
              <FeatureAction action={popup?.action} properties={properties} />
            </Stack>
          )}
        </div>
      </CanvasDrawer.Body>
    </CanvasDrawer>
  );
}

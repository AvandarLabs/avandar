import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Button, Stack } from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { CanvasDrawer } from "@/components/CanvasDrawer/CanvasDrawer";
import { ClusterFeatureTable } from "@/views/GisApp/panels/FeatureInspector/ClusterFeatureTable/ClusterFeatureTable";
import { FeatureAction } from "@/views/GisApp/panels/FeatureInspector/FeatureAction";
import { FeatureFields } from "@/views/GisApp/panels/FeatureInspector/FeatureFields";
import css from "@/views/GisApp/panels/FeatureInspector/FeatureInspector.module.css";
import { FeatureInspectorHeader } from "@/views/GisApp/panels/FeatureInspector/FeatureInspectorHeader/FeatureInspectorHeader";
import { PlaceFeatureActions } from "@/views/GisApp/panels/FeatureInspector/PlaceFeatureActions/PlaceFeatureActions";
import { PLACE_ID_COLUMN_NAME } from "@/views/GisApp/places/withPlaceIdColumn/withPlaceIdColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ClusterSelection } from "@/views/GisApp/MapCanvas/MapInstanceHelpers/MapInstanceHelpers";
import type {
  PlaceFeatureActionHandlers,
  PlaceFeatureTarget,
} from "@/views/GisApp/places/PlaceTool.types";
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

  /**
   * Edit, Move, and Delete for places; omitted where places cannot be
   * edited.
   */
  placeActions?: PlaceFeatureActionHandlers;
};

/** The places dataset a layer reads, when it reads one. */
function _getPlacesDatasetId(
  layer: MapLayer.T | undefined,
  placeActions: PlaceFeatureActionHandlers | undefined,
): Dataset.Id | undefined {
  const dataSource = layer?.source.dataSource;
  return placeActions &&
    dataSource &&
    Model.isOfModelType(dataSource, "Dataset") &&
    placeActions.placesDatasetIds.has(dataSource.id)
    ? dataSource.id
    : undefined;
}

/**
 * The clicked place and the fields it shows. A place's `place_id` only
 * identifies the row for Edit, Move, and Delete, so it is never shown.
 */
function _getPlaceView(
  options: Readonly<{
    layer: MapLayer.T | undefined;
    properties: Record<string, unknown>;
    placeActions: PlaceFeatureActionHandlers | undefined;
  }>,
): {
  placeTarget: PlaceFeatureTarget | undefined;
  visibleProperties: Record<string, unknown>;
} {
  const { properties } = options;
  const datasetId = _getPlacesDatasetId(options.layer, options.placeActions);
  if (!datasetId) {
    return { placeTarget: undefined, visibleProperties: properties };
  }
  const { [PLACE_ID_COLUMN_NAME]: placeId, ...visibleProperties } = properties;
  return {
    placeTarget:
      typeof placeId === "string" ? { datasetId, placeId } : undefined,
    visibleProperties,
  };
}

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
  placeActions,
}: Props): ReactNode {
  const { t } = useLingui();
  const popup = layer?.popup;
  const properties: Record<string, unknown> = feature?.properties ?? {};
  const { placeTarget, visibleProperties } = _getPlaceView({
    layer,
    properties,
    placeActions,
  });
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
              hiddenColumnNames={
                _getPlacesDatasetId(layer, placeActions)
                  ? [PLACE_ID_COLUMN_NAME]
                  : undefined
              }
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
              <FeatureFields properties={visibleProperties} />
              <FeatureAction action={popup?.action} properties={properties} />
              {placeTarget && placeActions ? (
                <PlaceFeatureActions
                  target={placeTarget}
                  handlers={placeActions}
                />
              ) : null}
            </Stack>
          )}
        </div>
      </CanvasDrawer.Body>
    </CanvasDrawer>
  );
}

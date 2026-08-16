import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { useSyncExternalStore } from "react";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  boundaryOptions: readonly BoundarySourceOption[];
  onLayerChange: LayerChangeHandler;
};

/** Selects the geometry source while reflecting Spatial capability state. */
export function GeometryBindingTypeSelect(props: Props): ReactNode {
  const { t } = useLingui();
  const availability = useSyncExternalStore(
    (listener) => {
      return DuckDbClient.subscribeSpatialAvailability(listener);
    },
    () => {
      return DuckDbClient.getSpatialAvailability();
    },
    () => {
      return DuckDbClient.getSpatialAvailability();
    },
  );
  const description =
    availability === "loading" ?
      t`Geometry columns are available when Spatial finishes loading.`
    : availability === "unavailable" ?
      t`Geometry columns need DuckDB Spatial, which is unavailable.`
    : undefined;
  return (
    <Select
      label={t`Geometry`}
      data={[
        {
          value: "latLngColumns",
          label: t`Latitude and longitude columns`,
          disabled: props.layer.sensitivity.mode === "aggregateOnly",
        },
        {
          value: "geometryColumn",
          label: t`Geometry column`,
          disabled: availability !== "available",
        },
        {
          value: "binPointsToGrid",
          label: t`Bin into a grid`,
          disabled: availability !== "available",
        },
        {
          value: "joinToBoundaries",
          label: t`Join to boundaries`,
          disabled:
            availability !== "available" ||
            props.boundaryOptions.every(({ columns }) => {
              return columns.length < 2;
            }),
        },
        {
          value: "aggregatePointsToBoundaries",
          label: t`Aggregate points to boundaries`,
          disabled:
            availability !== "available" ||
            props.boundaryOptions.every(({ columns }) => {
              return columns.length < 2;
            }),
        },
      ]}
      value={
        props.layer.geoBinding?.type === "geometryColumn" ? "geometryColumn"
        : props.layer.geoBinding?.type === "joinToBoundaries" ?
          "joinToBoundaries"
        : props.layer.geoBinding?.type === "aggregatePointsToBoundaries" ?
          "aggregatePointsToBoundaries"
        : props.layer.geoBinding?.type === "binPointsToGrid" ?
          "binPointsToGrid"
        : "latLngColumns"
      }
      allowDeselect={false}
      description={description}
      onChange={(value) => {
        if (!value) {
          return;
        }
        props.onLayerChange((current) => {
          if (value === "binPointsToGrid") {
            return MapLayerUpdates.withGridBin(current);
          }
          if (value === "joinToBoundaries") {
            const boundaryOption = props.boundaryOptions.find(({ columns }) => {
              return columns.length >= 2;
            });
            const dataKeyColumn = props.sourceColumns[0];
            if (!boundaryOption || !dataKeyColumn) {
              return current;
            }
            return MapLayerUpdates.withBoundaryJoin(current, {
              dataKeyColumn,
              matching: "exact",
              boundary: {
                datasetId: boundaryOption.dataset.id,
                geometryColumnId: boundaryOption.columns[0]!.id,
                geometryEncoding: "wkt",
                keyColumnId: boundaryOption.columns[1]!.id,
                displayNameColumnId: undefined,
                simplification: { tolerancePixels: 0.75 },
              },
            });
          }
          if (value === "aggregatePointsToBoundaries") {
            const boundaryOption = props.boundaryOptions.find(({ columns }) => {
              return columns.length >= 2;
            });
            if (!boundaryOption) {
              return current;
            }
            const currentBinding = current.geoBinding;
            const points: MapLayer.PointBinding =
              currentBinding?.type === "latLngColumns" ? currentBinding
              : (
                currentBinding?.type === "geometryColumn" &&
                currentBinding.family === "point"
              ) ?
                {
                  type: "geometryColumn",
                  column: currentBinding.column,
                  encoding: currentBinding.encoding,
                  family: "point",
                  simplification: undefined,
                  sourceCrs: currentBinding.sourceCrs,
                }
              : {
                  type: "latLngColumns",
                  latitude: undefined,
                  longitude: undefined,
                };
            return MapLayerUpdates.withPointAggregation(current, {
              points,
              boundary: {
                datasetId: boundaryOption.dataset.id,
                geometryColumnId: boundaryOption.columns[0]!.id,
                geometryEncoding: "wkt",
                keyColumnId: boundaryOption.columns[1]!.id,
                displayNameColumnId: undefined,
                simplification: { tolerancePixels: 0.75 },
              },
            });
          }
          return MapLayerUpdates.withGeometryBindingType(
            current,
            value as "latLngColumns" | "geometryColumn",
            props.sourceColumns[0],
          );
        });
      }}
    />
  );
}

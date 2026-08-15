import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { SimplificationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/SimplificationControls";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Edits a direct geometry-column binding without constructing SQL. */
export function GeometryColumnControls(props: Props): ReactNode {
  const { t } = useLingui();
  const binding = props.layer.geoBinding;
  if (binding?.type !== "geometryColumn") {
    return null;
  }
  const dataSourceId =
    props.layer.source.dataSource ?
      Model.getTypedId(props.layer.source.dataSource)
    : undefined;
  return (
    <>
      <QueryColumnSingleSelect
        label={t`Geometry column`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        value={
          MapLayerUpdates.getQueryColumnFromLayer({
            layer: props.layer,
            columnId: binding.column,
          }) ?? null
        }
        onChange={(column) => {
          if (!column) {
            return;
          }
          props.onLayerChange((current) => {
            return MapLayerUpdates.withGeometryColumn(current, column);
          });
        }}
      />
      <Select
        label={t`Encoding`}
        data={[
          { value: "wkt", label: t`WKT` },
          { value: "wkb", label: t`WKB` },
          { value: "geojson", label: t`GeoJSON` },
        ]}
        value={binding.encoding}
        allowDeselect={false}
        onChange={(encoding) => {
          if (!encoding) {
            return;
          }
          props.onLayerChange((current) => {
            return MapLayerUpdates.withGeometryEncoding(
              current,
              encoding as MapLayer.GeometryEncoding,
            );
          });
        }}
      />
      <Select
        label={t`Expected geometry`}
        data={[
          {
            value: "point",
            label: t`Point`,
            disabled: props.layer.sensitivity.mode === "aggregateOnly",
          },
          {
            value: "line",
            label: t`Line`,
            disabled: props.layer.sensitivity.mode === "aggregateOnly",
          },
          { value: "polygon", label: t`Polygon` },
        ]}
        value={binding.family}
        allowDeselect={false}
        description={
          props.layer.sensitivity.mode === "aggregateOnly" ?
            t`Aggregate-only layers require an area-producing binding.`
          : undefined
        }
        onChange={(family) => {
          if (!family) {
            return;
          }
          props.onLayerChange((current) => {
            return MapLayerUpdates.withGeometryFamily(
              current,
              family as MapLayer.GeometryFamily,
            );
          });
        }}
      />
      <SimplificationControls
        binding={binding}
        onLayerChange={props.onLayerChange}
      />
    </>
  );
}

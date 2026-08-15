import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { BoundaryJoinControls } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundaryJoinControls";
import { CoordinateBindingControls } from "@/views/GisApp/panels/LayerInspector/DataSection/CoordinateBindingControls";
import { GeometryBindingTypeSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryBindingTypeSelect";
import { GeometryColumnControls } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls";
import { PointAggregationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls";
import { useBoundarySourceOptions } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Edits the layer's data source and geometry binding. */
export function DataSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const sourceId =
    layer.source.dataSource ?
      Model.getTypedId(layer.source.dataSource)
    : undefined;
  const sourceColumns = useLayerSourceColumns(sourceId);
  const boundarySources = useBoundarySourceOptions(
    layer.source.dataSource?.workspaceId,
  );
  return (
    <InspectorSection title={t`Data`} defaultOpen>
      <QueryDataSourceSelect
        label={t`Source`}
        value={layer.source.dataSource ?? null}
        onChange={(dataSource) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withDataSource({
              layer: current,
              dataSource: dataSource ?? undefined,
            });
          });
        }}
      />
      <GeometryBindingTypeSelect
        layer={layer}
        sourceColumns={sourceColumns}
        boundaryOptions={boundarySources.options}
        onLayerChange={onLayerChange}
      />
      {layer.geoBinding?.type === "geometryColumn" ?
        <GeometryColumnControls layer={layer} onLayerChange={onLayerChange} />
      : layer.geoBinding?.type === "joinToBoundaries" ?
        <BoundaryJoinControls
          layer={layer}
          options={boundarySources.options}
          onLayerChange={onLayerChange}
        />
      : layer.geoBinding?.type === "aggregatePointsToBoundaries" ?
        <PointAggregationControls
          layer={layer}
          options={boundarySources.options}
          sourceColumns={sourceColumns}
          onLayerChange={onLayerChange}
        />
      : <CoordinateBindingControls
          layer={layer}
          onLayerChange={onLayerChange}
        />
      }
    </InspectorSection>
  );
}

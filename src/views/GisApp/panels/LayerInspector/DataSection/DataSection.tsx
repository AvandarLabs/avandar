import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { DataSectionBindingControls } from "@/views/GisApp/panels/LayerInspector/DataSection/DataSectionBindingControls";
import { DisputedStatusControls } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedStatusControls";
import { GeometryBindingTypeSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryBindingTypeSelect/GeometryBindingTypeSelect";
import { TimeColumnSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/TimeColumnSelect/TimeColumnSelect";
import { useBoundarySourceOptions } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
  layers?: readonly MapLayer.T[];
};

function _getBufferSourceName(
  layer: MapLayer.T,
  layers: readonly MapLayer.T[],
): string {
  const binding = layer.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    return "";
  }
  return (
    layers.find((item) => {
      return item.id === binding.layerId;
    })?.name ?? ""
  );
}

function _onDataSourceChange(
  onLayerChange: LayerChangeHandler,
): (dataSource: QueryDataSource.T | null) => void {
  return (dataSource) => {
    onLayerChange((current) => {
      return MapLayerUpdates.withDataSource({
        layer: current,
        dataSource: dataSource ?? undefined,
      });
    });
  };
}

/** Edits the layer's data source and geometry binding. */
export function DataSection({
  layer,
  onLayerChange,
  layers = [],
}: Props): ReactNode {
  const { t } = useLingui();
  const isBufferOfLayer = layer.geoBinding?.type === "bufferOfLayer";
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
      {isBufferOfLayer ? null : (
        <QueryDataSourceSelect
          label={t`Source`}
          value={layer.source.dataSource ?? null}
          onChange={_onDataSourceChange(onLayerChange)}
        />
      )}
      {isBufferOfLayer ? null : (
        <GeometryBindingTypeSelect
          layer={layer}
          sourceColumns={sourceColumns}
          boundaryOptions={boundarySources.options}
          onLayerChange={onLayerChange}
        />
      )}
      <DataSectionBindingControls
        layer={layer}
        sourceColumns={sourceColumns}
        boundaryOptions={boundarySources.options}
        sourceName={_getBufferSourceName(layer, layers)}
        onLayerChange={onLayerChange}
      />
      <TimeColumnSelect layer={layer} onLayerChange={onLayerChange} />
      <DisputedStatusControls layer={layer} onLayerChange={onLayerChange} />
    </InspectorSection>
  );
}

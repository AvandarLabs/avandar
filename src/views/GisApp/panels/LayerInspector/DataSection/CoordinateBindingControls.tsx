import { Model } from "@avandar/models";
import { CoordinateBindingStatus } from "@/views/GisApp/panels/LayerInspector/DataSection/CoordinateBindingStatus";
import { CoordinateColumnSelects } from "@/views/GisApp/panels/LayerInspector/DataSection/CoordinateColumnSelects";
import { useCoordinateBindingGuess } from "@/views/GisApp/panels/LayerInspector/DataSection/useCoordinateBindingGuess";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Coordinates binding inference, selection, and validation messages. */
export function CoordinateBindingControls({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const dataSourceId =
    layer.source.dataSource ?
      Model.getTypedId(layer.source.dataSource)
    : undefined;
  const sourceColumns = useLayerSourceColumns(dataSourceId);
  const guess = useCoordinateBindingGuess({
    layer,
    sourceColumns,
    onLayerChange,
  });
  const binding =
    layer.geoBinding?.type === "latLngColumns" ? layer.geoBinding : undefined;
  const isBound =
    binding?.latitude !== undefined && binding.longitude !== undefined;
  const hasCoordinateCandidates = guess !== undefined;
  if (!hasCoordinateCandidates && !isBound && !layer.source.dataSource) {
    return null;
  }
  return (
    <>
      {hasCoordinateCandidates || isBound ?
        <CoordinateColumnSelects
          layer={layer}
          dataSourceId={dataSourceId}
          onLayerChange={onLayerChange}
        />
      : null}
      <CoordinateBindingStatus
        layer={layer}
        guess={guess}
        isBound={isBound}
        hasCoordinateCandidates={hasCoordinateCandidates}
      />
    </>
  );
}

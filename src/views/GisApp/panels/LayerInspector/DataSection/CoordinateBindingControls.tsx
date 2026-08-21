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
      {/*
       * The pickers render whenever there is a source to pick from, not only
       * when the name guesser recognized a pair. A source whose coordinate
       * columns are named in a way the guesser misses is exactly the case that
       * needs a manual choice, and hiding the pickers there left the layer with
       * no way to bind at all.
       */}
      <CoordinateColumnSelects
        layer={layer}
        dataSourceId={dataSourceId}
        onLayerChange={onLayerChange}
      />
      <CoordinateBindingStatus
        layer={layer}
        guess={guess}
        isBound={isBound}
        hasCoordinateCandidates={hasCoordinateCandidates}
      />
    </>
  );
}

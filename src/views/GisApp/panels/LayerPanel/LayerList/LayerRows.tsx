import { LayerRow } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow";
import { makeStackOrderFromLayerMove } from "@/views/GisApp/panels/LayerPanel/makeStackOrderFromLayerMove/makeStackOrderFromLayerMove";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  rows: readonly MapLayer.T[];
  rowIds: readonly MapLayer.Id[];
  viewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  selectedLayerId: MapLayer.Id | undefined;
  onStackOrderChange: (ids: readonly MapLayer.Id[]) => void;
  onSelectLayer: (id: MapLayer.Id) => void;
  onToggleLayerVisible: (id: MapLayer.Id) => void;
  onRenameLayer: (id: MapLayer.Id) => void;
  onDuplicateLayer: (id: MapLayer.Id) => void;
  onZoomToLayer: (id: MapLayer.Id) => void;
  onDeleteLayer: (id: MapLayer.Id) => void;
};

/** Maps layer state and actions into ordered layer rows. */
export function LayerRows(props: Props): ReactNode {
  const { rows, rowIds, viewStates, selectedLayerId } = props;
  return rows.map((layer, rowIndex) => {
    const viewState = viewStates.get(layer.id);
    if (!viewState) {
      return null;
    }
    const bind = (handler: (id: MapLayer.Id) => void) => {
      return () => {
        handler(layer.id);
      };
    };
    return (
      <LayerRow
        key={layer.id}
        layer={layer}
        viewState={viewState}
        rowIndex={rowIndex}
        isSelected={layer.id === selectedLayerId}
        onSelect={bind(props.onSelectLayer)}
        onToggleVisible={bind(props.onToggleLayerVisible)}
        onRename={bind(props.onRenameLayer)}
        onDuplicate={bind(props.onDuplicateLayer)}
        onZoomToLayer={bind(props.onZoomToLayer)}
        onDelete={bind(props.onDeleteLayer)}
        onMoveByOffset={(offset) => {
          props.onStackOrderChange(
            makeStackOrderFromLayerMove({
              orderedLayerIds: rowIds,
              layerId: layer.id,
              offset,
            }),
          );
        }}
      />
    );
  });
}

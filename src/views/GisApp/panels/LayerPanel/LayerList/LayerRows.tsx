import { match } from "ts-pattern";
import { AnnotationLayerRow } from "@/views/GisApp/panels/LayerPanel/AnnotationLayerRow/AnnotationLayerRow";
import { LayerRow } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow";
import { makeStackOrderFromLayerMove } from "@/views/GisApp/panels/LayerPanel/makeStackOrderFromLayerMove/makeStackOrderFromLayerMove";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { LayerPanelItem } from "@/views/GisApp/panels/LayerPanel/LayerList/makeLayerPanelItemsFromRows";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  items: readonly LayerPanelItem[];
  rowIds: readonly MapLayer.Id[];
  viewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  selectedLayerId: MapLayer.Id | undefined;
  annotations?: AvaMapConfig.AnnotationLayer;
  isAnnotationRowSelected: boolean;
  onStackOrderChange: (ids: readonly MapLayer.Id[]) => void;
  onSelectLayer: (id: MapLayer.Id) => void;
  onSelectAnnotationRow: () => void;
  onToggleLayerVisible: (id: MapLayer.Id) => void;
  onToggleAnnotationsVisible: () => void;
  onMoveAnnotationsByOffset: (offset: -1 | 1) => void;
  onRenameLayer: (id: MapLayer.Id) => void;
  onDuplicateLayer: (id: MapLayer.Id) => void;
  onZoomToLayer: (id: MapLayer.Id) => void;
  onDeleteLayer: (id: MapLayer.Id) => void;
};

function _renderLayerRow(
  layer: MapLayer.T,
  rowIndex: number,
  props: Props,
): ReactNode {
  const viewState = props.viewStates.get(layer.id);
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
      isSelected={layer.id === props.selectedLayerId}
      onSelect={bind(props.onSelectLayer)}
      onToggleVisible={bind(props.onToggleLayerVisible)}
      onRename={bind(props.onRenameLayer)}
      onDuplicate={bind(props.onDuplicateLayer)}
      onZoomToLayer={bind(props.onZoomToLayer)}
      onDelete={bind(props.onDeleteLayer)}
      onMoveByOffset={(offset) => {
        props.onStackOrderChange(
          makeStackOrderFromLayerMove({
            orderedLayerIds: props.rowIds,
            layerId: layer.id,
            offset,
          }),
        );
      }}
    />
  );
}

/** Maps layer state and actions into ordered layer and annotation rows. */
export function LayerRows({
  items,
  rowIds,
  viewStates,
  selectedLayerId,
  annotations,
  isAnnotationRowSelected,
  onStackOrderChange,
  onSelectLayer,
  onSelectAnnotationRow,
  onToggleLayerVisible,
  onToggleAnnotationsVisible,
  onMoveAnnotationsByOffset,
  onRenameLayer,
  onDuplicateLayer,
  onZoomToLayer,
  onDeleteLayer,
}: Props): ReactNode {
  const rowProps: Props = {
    items,
    rowIds,
    viewStates,
    selectedLayerId,
    annotations,
    isAnnotationRowSelected,
    onStackOrderChange,
    onSelectLayer,
    onSelectAnnotationRow,
    onToggleLayerVisible,
    onToggleAnnotationsVisible,
    onMoveAnnotationsByOffset,
    onRenameLayer,
    onDuplicateLayer,
    onZoomToLayer,
    onDeleteLayer,
  };
  return items.map((item) => {
    return match(item)
      .with({ type: "annotations" }, () => {
        return (
          <AnnotationLayerRow
            key="annotations"
            isVisible={annotations?.isVisible ?? true}
            isSelected={isAnnotationRowSelected}
            onSelect={onSelectAnnotationRow}
            onToggleVisible={onToggleAnnotationsVisible}
            onMoveByOffset={onMoveAnnotationsByOffset}
          />
        );
      })
      .with({ type: "layer" }, ({ layer }) => {
        return _renderLayerRow(layer, rowIds.indexOf(layer.id), rowProps);
      })
      .exhaustive();
  });
}

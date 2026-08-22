import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import css from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList.module.css";
import { LayerRows } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerRows";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { LayerPanelItem } from "@/views/GisApp/panels/LayerPanel/LayerList/makeLayerPanelItemsFromRows";
import type { ReactNode } from "react";

type Props = {
  items: readonly LayerPanelItem[];
  rowIds: readonly MapLayer.Id[];
  viewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  selectedLayerId: MapLayer.Id | undefined;
  annotations: AvaMapConfig.AnnotationLayer | undefined;
  isAnnotationRowSelected: boolean;
  onStackOrderChange: (orderedLayerIds: readonly MapLayer.Id[]) => void;
  onSelectLayer: (layerId: MapLayer.Id) => void;
  onSelectAnnotationRow: () => void;
  onToggleLayerVisible: (layerId: MapLayer.Id) => void;
  onToggleAnnotationsVisible: () => void;
  onMoveAnnotationsByOffset: (offset: -1 | 1) => void;
  onRenameLayer: (layerId: MapLayer.Id) => void;
  onDuplicateLayer: (layerId: MapLayer.Id) => void;
  onZoomToLayer: (layerId: MapLayer.Id) => void;
  onDeleteLayer: (layerId: MapLayer.Id) => void;
};

/** Ordered layer list with pointer drag-and-drop. */
export function OrderedLayerRows({
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
}: Readonly<Props>): ReactNode {
  return (
    <DragDropProvider
      onDragEnd={(event) => {
        onStackOrderChange(move([...rowIds], event));
      }}
    >
      <ul className={css.layerList}>
        <LayerRows
          items={items}
          rowIds={rowIds}
          viewStates={viewStates}
          selectedLayerId={selectedLayerId}
          annotations={annotations}
          isAnnotationRowSelected={isAnnotationRowSelected}
          onStackOrderChange={onStackOrderChange}
          onSelectLayer={onSelectLayer}
          onSelectAnnotationRow={onSelectAnnotationRow}
          onToggleLayerVisible={onToggleLayerVisible}
          onToggleAnnotationsVisible={onToggleAnnotationsVisible}
          onMoveAnnotationsByOffset={onMoveAnnotationsByOffset}
          onRenameLayer={onRenameLayer}
          onDuplicateLayer={onDuplicateLayer}
          onZoomToLayer={onZoomToLayer}
          onDeleteLayer={onDeleteLayer}
        />
      </ul>
    </DragDropProvider>
  );
}

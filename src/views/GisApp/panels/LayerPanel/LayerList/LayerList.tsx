import { noop, prop } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import css from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList.module.css";
import { makeLayerPanelItemsFromRows } from "@/views/GisApp/panels/LayerPanel/LayerList/makeLayerPanelItemsFromRows";
import { OrderedLayerRows } from "@/views/GisApp/panels/LayerPanel/LayerList/OrderedLayerRows";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

type Props = {
  /** Layers in panel row order, with the topmost layer first. */
  rows: readonly MapLayer.T[];
  viewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  selectedLayerId: MapLayer.Id | undefined;
  annotations?: AvaMapConfig.AnnotationLayer;
  annotationsZIndex?: number;
  isAnnotationRowSelected?: boolean;
  onStackOrderChange: (orderedLayerIds: readonly MapLayer.Id[]) => void;
  onSelectLayer: (layerId: MapLayer.Id) => void;
  onSelectAnnotationRow?: () => void;
  onToggleLayerVisible: (layerId: MapLayer.Id) => void;
  onToggleAnnotationsVisible?: () => void;
  onMoveAnnotationsByOffset?: (offset: -1 | 1) => void;
  onRenameLayer: (layerId: MapLayer.Id) => void;
  onDuplicateLayer: (layerId: MapLayer.Id) => void;
  onZoomToLayer: (layerId: MapLayer.Id) => void;
  onDeleteLayer: (layerId: MapLayer.Id) => void;
};

function _noopMove(_offset: -1 | 1): void {
  return undefined;
}

/** Renders the ordered layer rows and connects pointer and keyboard reorder. */
export function LayerList({
  rows,
  viewStates,
  selectedLayerId,
  annotations,
  annotationsZIndex,
  isAnnotationRowSelected = false,
  onStackOrderChange,
  onSelectLayer,
  onSelectAnnotationRow = noop,
  onToggleLayerVisible,
  onToggleAnnotationsVisible = noop,
  onMoveAnnotationsByOffset = _noopMove,
  onRenameLayer,
  onDuplicateLayer,
  onZoomToLayer,
  onDeleteLayer,
}: Props): ReactNode {
  const { t } = useLingui();
  const rowIds = rows.map(prop("id"));
  const items = makeLayerPanelItemsFromRows({
    rows,
    annotations,
    annotationsZIndex,
  });
  if (items.length === 0) {
    return <div className={css.layerListEmpty}>{t`No layers yet.`}</div>;
  }
  return (
    <OrderedLayerRows
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
  );
}

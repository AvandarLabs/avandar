import { prop } from "@avandar/utils";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList.module.css";
import { LayerRows } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerRows";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  /** Layers in panel row order, with the topmost layer first. */
  rows: readonly MapLayer.T[];
  viewStates: ReadonlyMap<MapLayer.Id, MapLayerViewState>;
  selectedLayerId: MapLayer.Id | undefined;
  onStackOrderChange: (orderedLayerIds: readonly MapLayer.Id[]) => void;
  onSelectLayer: (layerId: MapLayer.Id) => void;
  onToggleLayerVisible: (layerId: MapLayer.Id) => void;
  onRenameLayer: (layerId: MapLayer.Id) => void;
  onDuplicateLayer: (layerId: MapLayer.Id) => void;
  onZoomToLayer: (layerId: MapLayer.Id) => void;
  onDeleteLayer: (layerId: MapLayer.Id) => void;
};

/** Renders the ordered layer rows and connects pointer and keyboard reorder. */
export function LayerList({
  rows,
  viewStates,
  selectedLayerId,
  onStackOrderChange,
  onSelectLayer,
  onToggleLayerVisible,
  onRenameLayer,
  onDuplicateLayer,
  onZoomToLayer,
  onDeleteLayer,
}: Props): ReactNode {
  const { t } = useLingui();
  const rowIds = rows.map(prop("id"));

  if (rows.length === 0) {
    return <div className={css.layerListEmpty}>{t`No layers yet.`}</div>;
  }

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        onStackOrderChange(move([...rowIds], event));
      }}
    >
      <ul className={css.layerList}>
        <LayerRows
          {...{
            rows,
            rowIds,
            viewStates,
            selectedLayerId,
            onStackOrderChange,
            onSelectLayer,
            onToggleLayerVisible,
            onRenameLayer,
            onDuplicateLayer,
            onZoomToLayer,
            onDeleteLayer,
          }}
        />
      </ul>
    </DragDropProvider>
  );
}

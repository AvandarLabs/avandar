import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowSelection/LayerRowSelection.module.css";
import { LayerStatusBadge } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerStatusBadge";
import { LayerSwatch } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerSwatch/LayerSwatch";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { KeyboardEvent, ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  viewState: MapLayerViewState;
  isSelected: boolean;
  instructionsId: string;
  onSelect: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
};

function _onMoveKeyDown(
  options: Readonly<{
    event: KeyboardEvent<HTMLButtonElement>;
    onMoveByOffset: Props["onMoveByOffset"];
  }>,
): void {
  const { event, onMoveByOffset } = options;
  if (!event.altKey) {
    return;
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    onMoveByOffset(-1);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    onMoveByOffset(1);
  }
}

/** Selects a layer and supports direct keyboard reordering. */
export function LayerRowSelection({
  layer,
  viewState,
  isSelected,
  instructionsId,
  onSelect,
  onMoveByOffset,
}: Props): ReactNode {
  return (
    <button
      type="button"
      className={css.layerRowSelection}
      aria-current={isSelected}
      aria-describedby={instructionsId}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
      onClick={onSelect}
      onKeyDown={(event) => {
        _onMoveKeyDown({ event, onMoveByOffset });
      }}
    >
      <LayerSwatch symbology={layer.symbology} />
      <span className={css.layerRowSelectionText}>
        <span className={css.layerRowSelectionName}>{layer.name}</span>
        <span className={css.layerRowSelectionMeta}>
          <LayerStatusBadge viewState={viewState} />
        </span>
      </span>
    </button>
  );
}

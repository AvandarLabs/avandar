import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowSelection.module.css";
import { LayerStatusBadge } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerStatusBadge/LayerStatusBadge";
import { LayerSwatch } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerSwatch";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { KeyboardEvent, ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  viewState: MapLayerViewState;
  isSelected: boolean;
  instructionsId: string;
  onSelect: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
};

function _handleMoveKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  onMoveByOffset: Props["onMoveByOffset"],
): void {
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
export function LayerRowSelection(props: Props): ReactNode {
  const { layer, viewState } = props;
  return (
    <button
      type="button"
      className={css.layerRowSelection}
      aria-current={props.isSelected}
      aria-describedby={props.instructionsId}
      aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
      onClick={props.onSelect}
      onKeyDown={(event) => {
        _handleMoveKeyDown(event, props.onMoveByOffset);
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

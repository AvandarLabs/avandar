import { useSortable } from "@dnd-kit/react/sortable";
import { LayerActionsMenu } from "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow.module.css";
import { LayerRowDragHandle } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowDragHandle/LayerRowDragHandle";
import { LayerRowInstructions } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowInstructions/LayerRowInstructions";
import { LayerRowSelection } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowSelection/LayerRowSelection";
import { LayerVisibilityButton } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerVisibilityButton";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  viewState: MapLayerViewState;
  isSelected: boolean;
  rowIndex: number;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
};

/** Renders the selection, visibility, drag, status, and action controls. */
export function LayerRow({
  layer,
  viewState,
  isSelected,
  rowIndex,
  onSelect,
  onToggleVisible,
  onMoveByOffset,
  onRename,
  onDuplicate,
  onZoomToLayer,
  onDelete,
}: Props): ReactNode {
  const dragId = `layer-${layer.id}-drag-instructions`;
  const keyboardMoveId = `layer-${layer.id}-keyboard-move-instructions`;
  const { ref, handleRef, isDragging } = useSortable({
    id: layer.id,
    index: rowIndex,
  });
  return (
    <li ref={ref}>
      <div
        className={css.layerRow}
        data-selected={isSelected}
        data-dragging={isDragging}
        data-hidden={!layer.isVisible}
      >
        <LayerRowDragHandle
          {...{ handleRef, instructionsId: dragId }}
          layerName={layer.name}
        />
        <LayerVisibilityButton
          layerName={layer.name}
          isVisible={layer.isVisible}
          onClick={onToggleVisible}
        />
        <LayerRowSelection
          layer={layer}
          viewState={viewState}
          isSelected={isSelected}
          instructionsId={keyboardMoveId}
          onSelect={onSelect}
          onMoveByOffset={onMoveByOffset}
        />
        <LayerActionsMenu
          layerName={layer.name}
          onRename={onRename}
          onDuplicate={onDuplicate}
          onZoomToLayer={onZoomToLayer}
          onDelete={onDelete}
        />
        <LayerRowInstructions dragId={dragId} keyboardMoveId={keyboardMoveId} />
      </div>
    </li>
  );
}

import { useSortable } from "@dnd-kit/react/sortable";
import { LayerActionsMenu } from "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow.module.css";
import { LayerRowDragHandle } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowDragHandle";
import { LayerRowInstructions } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowInstructions";
import { LayerRowSelection } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowSelection";
import { LayerVisibilityButton } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerVisibilityButton";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
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
export function LayerRow(props: Props): ReactNode {
  const { layer } = props;
  const dragId = `layer-${layer.id}-drag-instructions`;
  const keyboardMoveId = `layer-${layer.id}-keyboard-move-instructions`;
  const { ref, handleRef, isDragging } = useSortable({
    id: layer.id,
    index: props.rowIndex,
  });
  return (
    <li ref={ref}>
      <div
        className={css.layerRow}
        data-selected={props.isSelected}
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
          onClick={props.onToggleVisible}
        />
        <LayerRowSelection {...props} instructionsId={keyboardMoveId} />
        <LayerActionsMenu layerName={layer.name} {...props} />
        <LayerRowInstructions dragId={dragId} keyboardMoveId={keyboardMoveId} />
      </div>
    </li>
  );
}

import { useLingui } from "@lingui/react/macro";
import { IconPencil } from "@tabler/icons-react";
import css from "@/views/GisApp/panels/LayerPanel/AnnotationLayerRow/AnnotationLayerRow.module.css";
import { LayerVisibilityButton } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerVisibilityButton";
import type { KeyboardEvent, ReactNode } from "react";

type Props = {
  isVisible: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
};

function _onMoveKeyDown(
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

/** Pinned overlay row for persisted annotations; not a data layer. */
export function AnnotationLayerRow({
  isVisible,
  isSelected,
  onSelect,
  onToggleVisible,
  onMoveByOffset,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const name = t`Annotations`;
  const keyboardMoveId = "annotations-keyboard-move-instructions";
  return (
    <li>
      <div
        className={css.annotationLayerRow}
        data-selected={isSelected}
        data-hidden={!isVisible}
      >
        <span aria-hidden />
        <LayerVisibilityButton
          layerName={name}
          isVisible={isVisible}
          onClick={onToggleVisible}
        />
        <button
          type="button"
          className={css.annotationLayerRowSelection}
          aria-current={isSelected}
          aria-describedby={keyboardMoveId}
          aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"
          onClick={onSelect}
          onKeyDown={(event) => {
            _onMoveKeyDown(event, onMoveByOffset);
          }}
        >
          <IconPencil size={14} stroke={1.5} />
          <span className={css.annotationLayerRowSelectionName}>{name}</span>
        </button>
        <span aria-hidden />
        <span
          id={keyboardMoveId}
          className={css.annotationLayerRowInstructions}
        >
          {t`Hold Alt and press the up or down arrow to move this layer.`}
        </span>
      </div>
    </li>
  );
}

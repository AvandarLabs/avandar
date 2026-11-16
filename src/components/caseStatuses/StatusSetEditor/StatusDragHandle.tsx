import { useLingui } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import { IconGripVertical } from "@tabler/icons-react";
import { useId } from "react";
import css from "@/components/caseStatuses/StatusSetEditor/StatusSetEditor.module.css";
import type { KeyboardEvent, ReactNode, Ref } from "react";

type Props = {
  statusName: string;
  handleRef: Ref<HTMLButtonElement>;
  isDragging: boolean;
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

/**
 * The reorder handle of one status row. Pointer users drag it. Keyboard users
 * either pick the row up with Space or Enter and move it with the arrow keys
 * (the drag and drop keyboard sensor), or hold Alt and press an arrow to move
 * it one place at once.
 */
export function StatusDragHandle({
  statusName,
  handleRef,
  isDragging,
  onMoveByOffset,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const instructionsId = useId();

  return (
    <>
      <button
        type="button"
        ref={handleRef}
        className={css.statusSetEditorHandle}
        aria-label={t`Reorder ${statusName}`}
        aria-describedby={instructionsId}
        aria-keyshortcuts="Space Enter Alt+ArrowUp Alt+ArrowDown"
        onKeyDown={(event) => {
          // While the keyboard sensor is carrying the row, the arrow keys
          // belong to it.
          if (!isDragging) {
            _onMoveKeyDown({ event, onMoveByOffset });
          }
        }}
      >
        <IconGripVertical size={14} stroke={2} aria-hidden />
      </button>
      <VisuallyHidden id={instructionsId}>
        {t`Press Space or Enter to pick up this status, move it with the arrow keys, then press Space or Enter to drop it. Or hold Alt and press the up or down arrow to move it one place.`}
      </VisuallyHidden>
    </>
  );
}

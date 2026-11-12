import { useLingui } from "@lingui/react/macro";
import { VisuallyHidden } from "@mantine/core";
import { useMergedRef } from "@mantine/hooks";
import { IconGripVertical } from "@tabler/icons-react";
import { useEffect, useId, useRef } from "react";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import type { KeyboardEvent, ReactNode, Ref } from "react";

type Props = {
  valueName: string;
  handleRef: Ref<HTMLButtonElement>;
  isDragging: boolean;
  /** Takes focus when the handle mounts. */
  shouldFocus: boolean;
  /** Called after the handle took focus because `shouldFocus` was set. */
  onFocused: () => void;
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
 * The reorder handle of one value in an ordered code list. Pointer users
 * drag it. Keyboard users pick the row up with Space or Enter and move it
 * with the arrow keys, or hold Alt and press an arrow to move it one place.
 */
export function CodePairDragHandle({
  valueName,
  handleRef,
  isDragging,
  shouldFocus,
  onFocused,
  onMoveByOffset,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const instructionsId = useId();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const mergedRef = useMergedRef(buttonRef, handleRef);

  useEffect(() => {
    if (shouldFocus) {
      buttonRef.current?.focus();
      onFocused();
    }
  }, [shouldFocus, onFocused]);

  return (
    <>
      <button
        type="button"
        ref={mergedRef}
        className={css.codeListEditorHandle}
        aria-label={t`Reorder ${valueName}`}
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
        {t`Press Space or Enter to pick up this value, move it with the arrow keys, then press Space or Enter to drop it. Or hold Alt and press the up or down arrow to move it one place.`}
      </VisuallyHidden>
    </>
  );
}

import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowInstructions/LayerRowInstructions.module.css";
import type { ReactNode } from "react";

type Props = { dragId: string; keyboardMoveId: string };

/** Provides assistive instructions for both layer reorder mechanisms. */
export function LayerRowInstructions({
  dragId,
  keyboardMoveId,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <span id={dragId} className={css.layerRowInstructions}>
        {t`Press Space or Enter to start dragging. Use the arrow keys to move the layer, then press Space or Enter to drop, or Escape to cancel.`}
      </span>
      <span id={keyboardMoveId} className={css.layerRowInstructions}>
        {t`Hold Alt and press the up or down arrow to move this layer.`}
      </span>
    </>
  );
}

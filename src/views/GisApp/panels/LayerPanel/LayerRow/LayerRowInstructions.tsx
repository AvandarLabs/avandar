import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowInstructions.module.css";
import type { ReactNode } from "react";

type Props = { dragId: string; keyboardMoveId: string };

/** Provides assistive instructions for both layer reorder mechanisms. */
export function LayerRowInstructions(props: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <span id={props.dragId} className={css.layerRowInstructions}>
        {t`Press Space or Enter to start dragging. Use the arrow keys to move the layer, then press Space or Enter to drop, or Escape to cancel.`}
      </span>
      <span id={props.keyboardMoveId} className={css.layerRowInstructions}>
        {t`Hold Alt and press the up or down arrow to move this layer.`}
      </span>
    </>
  );
}

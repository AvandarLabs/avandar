import { useLingui } from "@lingui/react/macro";
import { IconGripVertical } from "@tabler/icons-react";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRowDragHandle.module.css";
import type { ReactNode, Ref } from "react";

type Props = {
  layerName: string;
  instructionsId: string;
  handleRef: Ref<HTMLButtonElement>;
};

/** Provides the pointer and keyboard drag handle for a layer row. */
export function LayerRowDragHandle(props: Props): ReactNode {
  const { t } = useLingui();
  return (
    <button
      type="button"
      ref={props.handleRef}
      className={css.layerRowDragHandle}
      aria-label={t`Reorder layer ${props.layerName}`}
      aria-describedby={props.instructionsId}
      aria-keyshortcuts="Space Enter"
      title={t`Drag to reorder, or hold Alt and press the up or down arrow`}
    >
      <IconGripVertical size={12} stroke={2} />
    </button>
  );
}

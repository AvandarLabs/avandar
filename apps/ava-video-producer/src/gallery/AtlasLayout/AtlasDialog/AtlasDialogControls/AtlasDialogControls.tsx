import { Icon } from "../../../MotionGallery/Icon";
import css from "./AtlasDialogControls.module.css";
import { AtlasDialogStepButton } from "./AtlasDialogStepButton/AtlasDialogStepButton";
import type { ReactNode } from "react";

type Props = {
  previousLabel: string;
  nextLabel: string;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
};
/** Moves between entries or closes the AtlasDialog preview. */
export function AtlasDialogControls({
  previousLabel,
  nextLabel,
  onPrevious,
  onNext,
  onClose,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.atlasDialogControlsControls}
      role="group"
      aria-label="Preview controls"
    >
      <AtlasDialogStepButton
        label={previousLabel}
        onStep={onPrevious}
        icon="previous"
      />
      <AtlasDialogStepButton label={nextLabel} onStep={onNext} icon="arrow" />
      <button
        type="button"
        className={css.atlasDialogControlsIconButton}
        onClick={onClose}
        aria-label="Close preview"
        title="Close preview"
        autoFocus
      >
        <Icon name="close" />
      </button>
    </div>
  );
}

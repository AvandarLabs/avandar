import { Icon } from "../../../../MotionGallery/Icon";
import css from "./AtlasDialogStepButton.module.css";
import type { ReactNode } from "react";

type Props = { label: string; onStep?: () => void; icon: "previous" | "arrow" };
/**
 * Provides an adjacent-item navigation button in the Atlas preview controls.
 */
export function AtlasDialogStepButton({
  label,
  onStep,
  icon,
}: Readonly<Props>): ReactNode {
  return (
    <button
      type="button"
      className={css.atlasDialogStepButtonAtlasDialogControlsIconButton}
      onClick={onStep}
      disabled={!onStep}
      aria-label={label}
      title={label}
    >
      <Icon name={icon} />
    </button>
  );
}

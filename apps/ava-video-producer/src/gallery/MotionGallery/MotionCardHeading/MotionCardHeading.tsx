import { clsx } from "clsx";
import { Icon } from "../Icon";
import css from "./MotionCardHeading.module.css";
import type { StockPresetId } from "../../../stock/stockEntry";
import type { Preset } from "../Preset.types";
import type { ReactNode } from "react";

type Props = {
  preset: Preset;
  saved: boolean;
  onOpen: (preset: Preset) => void;
  onSave: (id: StockPresetId) => void;
};
/** Opens or saves the preset named by MotionCard. */
export function MotionCardHeading({
  preset,
  saved,
  onOpen,
  onSave,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.motionCardHeadingCardHeading}>
      <button
        className={css.motionCardHeadingCardTitle}
        onClick={() => {
          return onOpen(preset);
        }}
      >
        {preset.name}
      </button>
      <button
        className={clsx(
          css.motionCardHeadingSaveButton,
          saved ? "is-saved" : "",
        )}
        onClick={() => {
          return onSave(preset.id);
        }}
        aria-label={
          saved
            ? `Remove ${preset.name} from references`
            : `Save ${preset.name} to references`
        }
        aria-pressed={saved}
      >
        <Icon name={saved ? "check" : "bookmark"} size={17} />
      </button>
    </div>
  );
}

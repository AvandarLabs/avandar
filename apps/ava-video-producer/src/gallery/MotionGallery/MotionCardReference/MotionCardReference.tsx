import { Icon } from "../Icon";
import css from "./MotionCardReference.module.css";
import type { Preset } from "../Preset.types";
import type { ReactNode } from "react";

type Props = {
  preset: Preset;
  index: number;
  onOpen: (preset: Preset) => void;
};
/** Shows the stable catalog reference and details action for MotionCard. */
export function MotionCardReference({
  preset,
  index,
  onOpen,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.motionCardReferenceCardFoot}>
      <code>
        {String(index + 1).padStart(2, "0")}/{preset.id}
      </code>
      <button
        onClick={() => {
          return onOpen(preset);
        }}
        aria-label={`View ${preset.name} details`}
      >
        <span>Explore</span>
        <Icon name="arrow" size={15} />
      </button>
    </div>
  );
}

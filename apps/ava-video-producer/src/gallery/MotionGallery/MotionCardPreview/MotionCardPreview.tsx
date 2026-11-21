import { StockGraphic } from "../../../stock/StockGraphic/StockGraphic";
import { GalleryItemTheme } from "../../GalleryVideoTheme/GalleryItemTheme";
import { Icon } from "../Icon";
import css from "./MotionCardPreview.module.css";
import type { ContentDraft } from "../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../Preset.types";
import type { Ref, ReactNode } from "react";

type Props = {
  element: Ref<HTMLButtonElement>;
  preset: Preset;
  visible: boolean;
  contentState?: ContentDraft;
  frame: number;
  onOpen: (preset: Preset) => void;
};
/** Renders the visible MotionCard thumbnail and its preview-opening button. */
export function MotionCardPreview({
  element,
  preset,
  visible,
  contentState,
  frame,
  onOpen,
}: Readonly<Props>): ReactNode {
  return (
    <button
      ref={element}
      className={css.motionCardPreviewCardPreview}
      onClick={() => {
        return onOpen(preset);
      }}
      aria-label={`Explore ${preset.name}`}
    >
      {visible ? (
        <GalleryItemTheme itemId={preset.id}>
          <StockGraphic
            {...({
              preset: preset.id,
              input: contentState?.resolvedInput,
            } as import("../../../stock/contracts/StockContract.types").StockRequest)}
            frame={frame}
          />
        </GalleryItemTheme>
      ) : (
        <span className={css.motionCardPreviewCardStill} aria-hidden="true">
          <Icon name="pause" size={24} />
        </span>
      )}
      <span className={css.motionCardPreviewPreviewOpen}>
        <Icon name="arrow" size={21} />
      </span>
    </button>
  );
}

import css from "./MotionCard.module.css";
import type { ReactNode } from "react";

type Props = {
  contentState?: ContentDraft;
  preset: Preset;
  index: number;
  playing: boolean;
  saved: boolean;
  onOpen: (preset: Preset) => void;
  onSave: (id: StockPresetId) => void;
};
import { memo } from "react";
import { useFrames, useVisible } from "../galleryClockHelpers";
import { MotionCardCopy } from "../MotionCardCopy/MotionCardCopy";
import { MotionCardPreview } from "../MotionCardPreview/MotionCardPreview";
import type { StockPresetId } from "../../../stock/stockEntry";
import type { ContentDraft } from "../ContentControls/ContentDraftModule/ContentDraftModule";
import type { Preset } from "../Preset.types";
/**
 * Previews one stock motion with visible playback and saved-reference
 * actions.
 */
export const MotionCard = memo(function MotionCard({
  preset,
  index,
  playing,
  saved,
  onOpen,
  onSave,
  contentState,
}: Readonly<Props>): ReactNode {
  const [element, visible] = useVisible();
  const [frame] = useFrames({
    active: playing && visible,
    length: preset.loopFrames,
    initial: preset.id === "bar-race" ? 150 : 45 + ((index * 7) % 60),
  });
  return (
    <article className={css.motionCard}>
      <MotionCardPreview
        {...{ element, preset, visible, contentState, frame, onOpen }}
      />
      <MotionCardCopy
        {...{ preset, index, playing, visible, saved, onOpen, onSave }}
      />
    </article>
  );
});

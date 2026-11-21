import { clsx } from "clsx";
import { memo } from "react";
import { AtlasCard } from "../../AtlasLayout/AtlasCard/AtlasCard";
import { useFrames, useVisible } from "../../MotionGallery/galleryClockHelpers";
import css from "./HelperCard.module.css";
import { HelperCardThumbnail } from "./HelperCardThumbnail/HelperCardThumbnail";
import type { HelperEntry } from "../helperCatalog.types";
import type { ReactNode } from "react";

type Props = {
  helper: HelperEntry;
  category: string;
  playing: boolean;
  onOpen: (helperId: string) => void;
};
/**
 * A helper card whose thumbnail is the helper's real demo, rendered frame by
 * frame from the gallery clock while the card is on screen and playing.
 */
export const HelperCard = memo(function HelperCard({
  helper,
  category,
  playing,
  onOpen,
}: Readonly<Props>): ReactNode {
  const [element, visible] = useVisible();
  const [frame] = useFrames({
    active: playing && visible,
    length: helper.demo.frames,
    initial: Math.floor(helper.demo.frames / 2),
  });
  return (
    <AtlasCard
      title={helper.title}
      category={category}
      description={helper.description}
      reference={helper.exports.join(", ")}
      previewRef={element}
      badge={
        <span
          className={clsx(
            css.helperCardState,
            playing && visible && "is-playing",
          )}
        >
          <i />
          {playing && visible ? "LIVE" : "PAUSED"}
        </span>
      }
      thumbnail={
        visible ? <HelperCardThumbnail {...{ helper, frame }} /> : null
      }
      onOpen={() => {
        return onOpen(helper.id);
      }}
    />
  );
});

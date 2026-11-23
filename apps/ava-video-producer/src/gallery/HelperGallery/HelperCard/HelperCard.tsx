import { Thumbnail } from "@remotion/player";
import { memo } from "react";
import { AtlasCard } from "../../AtlasLayout/AtlasCard/AtlasCard";
import { useFrames, useVisible } from "../../MotionGallery/useGalleryClock";
import { HELPER_CANVAS } from "../helperCatalog";
import { HelperComposition } from "../HelperPlayer/HelperComposition";
import type { HelperEntry } from "../helperCatalog.types";

/**
 * Remotion sizes a thumbnail through inline styles, so the fill has to be
 * passed the same way; a class is overridden.
 */
const THUMBNAIL_STYLE = {
  height: "100%",
  inset: 0,
  position: "absolute",
  width: "100%",
} as const;

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
}: Props) {
  const [element, visible] = useVisible();
  const [frame] = useFrames(
    playing && visible,
    helper.demo.frames,
    Math.floor(helper.demo.frames / 2),
  );
  return (
    <AtlasCard
      title={helper.title}
      category={category}
      description={helper.description}
      reference={helper.exports.join(", ")}
      previewRef={element}
      badge={
        <span
          className={`card-state ${playing && visible ? "is-playing" : ""}`}
        >
          <i />
          {playing && visible ? "LIVE" : "PAUSED"}
        </span>
      }
      thumbnail={
        visible ? (
          <Thumbnail
            component={HelperComposition}
            inputProps={{ helperId: helper.id }}
            frameToDisplay={frame}
            durationInFrames={helper.demo.frames}
            compositionWidth={HELPER_CANVAS.width}
            compositionHeight={HELPER_CANVAS.height}
            fps={30}
            style={THUMBNAIL_STYLE}
          />
        ) : null
      }
      onOpen={() => onOpen(helper.id)}
    />
  );
});

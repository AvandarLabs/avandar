import { Thumbnail } from "@remotion/player";
import { HELPER_CANVAS } from "../../HelperFilmIds";
import { HelperComposition } from "../../HelperPlayer/HelperComposition";
import type { HelperEntry } from "../../helperCatalog.types";
import type { ReactNode } from "react";
/** Remotion overrides class sizes, so thumbnails require inline fill styles. */
const THUMBNAIL_STYLE = {
  height: "100%",
  inset: 0,
  position: "absolute",
  width: "100%",
} as const;
type Props = { helper: HelperEntry; frame: number };
/**
 * Shows the live helper composition inside HelperCard using Remotion sizing.
 */
export function HelperCardThumbnail({
  helper,
  frame,
}: Readonly<Props>): ReactNode {
  return (
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
  );
}

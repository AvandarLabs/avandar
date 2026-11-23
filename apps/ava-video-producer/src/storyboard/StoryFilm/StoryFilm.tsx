import { useCurrentFrame } from "remotion";
import { StoryFilmPicture } from "./StoryFilmPicture";
import { type Props } from "./StoryFilmShared/StoryFilmShared.types";
import type { ReactNode } from "react";

export type { ProductSceneRenderer } from "./ShotView";
/**
 * Plays a storyboard: each shot over the previous one through its shot
 * transition (a dissolve by default, a stepped column wipe, or a hard cut),
 * with each shot's own theme tokens layered over the plan theme.
 */
export function StoryFilm({
  plan: propsPlan,
  productScene: propsProductScene,
  showCaptions: propsShowCaptions,
}: Props): ReactNode {
  const frame = useCurrentFrame();
  return (
    <StoryFilmPicture
      {...{
        plan: propsPlan,
        productScene: propsProductScene,
        showCaptions: propsShowCaptions,
      }}
      frame={frame}
    />
  );
}

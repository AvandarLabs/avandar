import { AbsoluteFill } from "remotion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTokens } from "../../videoTheme/useVideoTheme";
import { _FilmCaptions } from "./_FilmCaptions";
import { _OutgoingShotLayer } from "./_OutgoingShotLayer";
import { _ShotLayer } from "./_ShotLayer";
import { StoryFilmShared } from "./StoryFilmShared/StoryFilmShared";
import { type Props } from "./StoryFilmShared/StoryFilmShared.types";
import type { ReactNode } from "react";

type FilmFrameOptions = Props & { frame: number };
/**
 * Composes active shots, transitions, captions, and the loop fade for
 * `StoryFilmPicture`.
 */
export function FilmFrame({
  plan,
  productScene,
  showCaptions = true,
  frame,
}: FilmFrameOptions): ReactNode {
  const motion = useVideoMotion();
  const tokens = useVideoTokens();
  const { shot, previous, localFrame, layers } =
    StoryFilmShared.getShotLayersAtFrame({ plan, frame, motion });
  const loopOut = StoryFilmShared.getLoopOutOpacity({ plan, frame, motion });
  const common = {
    width: plan.width,
    height: StoryFilmShared.getSceneHeight(plan),
    productScene,
  };
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground }}>
      <AbsoluteFill style={{ opacity: loopOut }}>
        {previous && layers.outgoing ? (
          <_OutgoingShotLayer
            {...common}
            shot={previous}
            layer={layers.outgoing}
          />
        ) : null}
        <_ShotLayer
          {...common}
          shot={shot}
          frame={localFrame}
          style={layers.incoming}
        />
        {plan.captions && showCaptions ? (
          <_FilmCaptions plan={plan} frame={frame} />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

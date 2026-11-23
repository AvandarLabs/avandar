import { clsx } from "clsx";
import { useId } from "react";
import { getHorizontalBlurFilter } from "../../../../../motion-components/getHorizontalBlurFilter/getHorizontalBlurFilter";
import { HorizontalBlurFilter } from "../../../../../motion-components/HorizontalBlurFilter";
import { getShotTransitionLayers } from "../../../../../storyboard/StoryFilm/getShotTransitionLayers/getShotTransitionLayers";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { TransitionDemosGalleryValues } from "../TransitionDemosGalleryValues/TransitionDemosGalleryValues";
import css from "./ShotBoundary.module.css";
import type { ShotTransition } from "../../../../../storyboard/schema/shotTransitionSchema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  transition?: ShotTransition;
  frames: number;
};

const SHOT_WIDTH = 270;

/** One shot boundary drawn from the two layers the helper returns. */
export function ShotBoundary(props: Readonly<Props>): ReactNode {
  const filterId = `shot-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const motion = useVideoMotion();
  if (props.frame < TransitionDemosGalleryValues.CUT_AT) {
    return (
      <div className={clsx(css.shotBoundaryShot, css.shotBoundaryShotA)}>A</div>
    );
  }
  const layers = getShotTransitionLayers({
    transition: props.transition,
    transitionInFrames: props.frames,
    previousDurationInFrames: TransitionDemosGalleryValues.CUT_AT,
    localFrame: props.frame - TransitionDemosGalleryValues.CUT_AT,
    width: SHOT_WIDTH,
    motion,
  });
  return (
    <>
      {layers.outgoing ? (
        <>
          <HorizontalBlurFilter id={filterId} amount={layers.outgoing.blurX} />
          <div
            className={clsx(css.shotBoundaryShot, css.shotBoundaryShotA)}
            style={{
              transform: `translateX(${layers.outgoing.offsetX.toFixed(2)}px)`,
              filter: getHorizontalBlurFilter({
                id: filterId,
                amount: layers.outgoing.blurX,
              }),
            }}
          >
            A
          </div>
        </>
      ) : null}
      <div
        className={clsx(css.shotBoundaryShot, css.shotBoundaryShotB)}
        style={layers.incoming}
      >
        B
      </div>
    </>
  );
}

import {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "../../motion-components/HorizontalBlur";
import { _ShotLayer } from "./_ShotLayer";
import { type OutgoingShotLayer } from "./getShotTransitionLayers/getShotTransitionLayers";
import { StoryFilmShared } from "./StoryFilmShared/StoryFilmShared";
import { type ShotLayerProps } from "./StoryFilmShared/StoryFilmShared.types";
import type { ReactNode } from "react";

type OutgoingShotLayerOptions = Omit<ShotLayerProps, "frame" | "style"> & {
  layer: OutgoingShotLayer;
};
/** The outgoing shot, drifted and blurred by its transition layer. */
export function _OutgoingShotLayer({
  layer,
  ...props
}: OutgoingShotLayerOptions): ReactNode {
  return (
    <>
      <HorizontalBlurFilter
        id={StoryFilmShared.OUTGOING_BLUR_ID}
        amount={layer.blurX}
      />
      <_ShotLayer
        {...props}
        frame={layer.frame}
        style={{
          transform: `translateX(${layer.offsetX.toFixed(2)}px)`,
          filter: getHorizontalBlurFilter(
            StoryFilmShared.OUTGOING_BLUR_ID,
            layer.blurX,
          ),
        }}
      />
    </>
  );
}

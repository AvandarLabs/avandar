import { SceneShell } from "../SceneShell/SceneShell";
import { MediaFigure } from "./MediaFigure/MediaFigure";
import { MediaHeader } from "./MediaHeader/MediaHeader";
import { useMediaSceneState } from "./useMediaSceneState";
import type { MediaSceneProps as Props } from "../scenes.types";
import type { ReactNode } from "react";
/**
 * Media stays stationary. Any crop is fixed for the entire scene. The
 * heading is `text.stage.cardTitle` at its fitted size, callouts are
 * `text.stage.caption` labels with emphasis outlines in the strong brand
 * colour.
 */
export function MediaScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  kind,
  src,
  trimBefore = 0,
  fit = "contain",
  objectPosition = { x: 0.5, y: 0.5 },
  crop = { x: 0, y: 0, width: 1, height: 1 },
  callouts = [],
}: Props): ReactNode {
  const content = useMediaSceneState({
    input: {
      frame,
      width,
      height,
      title,
      kicker,
      kind,
      src,
      trimBefore,
      fit,
      objectPosition,
      crop,
      callouts,
    },
  });
  return (
    <SceneShell {...{ frame, width, height }}>
      {content.heading || content.subtitle ? (
        <MediaHeader {...content} />
      ) : null}
      <MediaFigure {...content} />
    </SceneShell>
  );
}

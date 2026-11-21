import { SceneShell } from "../SceneShell/SceneShell";
import { RacePair } from "./RacePair/RacePair";
import { SingleWindow } from "./SingleWindow";
import { WindowFootnote } from "./WindowFootnote";
import { WindowHeadlines } from "./WindowHeadlines/WindowHeadlines";
import type { TiltedWindowSceneProps as Props } from "../scenes.types";
import type { ReactNode } from "react";
/**
 * A headline on the left and captured product stills or footage in a 3D
 * tilted window on the right, for a feature beat in a launch-style film.
 * The window whips in and out, can cycle through a carousel, carry a
 * second small window, push in with a camera, or open full-bleed and pull
 * back into place. The `pair` layout races two windows side by side.
 *
 * Only stills and footage go in the window: live product UI must never sit
 * under its lasting 3D transform.
 */
export function TiltedWindowScene(props: Props): ReactNode {
  const { frame, width = 1600, height = 1000, headlines, exit } = props;
  return (
    <SceneShell frame={frame} width={width} height={height}>
      {headlines?.length ? (
        <WindowHeadlines
          frame={frame}
          headlines={headlines}
          width={width}
          height={height}
          exitAtFrame={exit?.atFrame}
        />
      ) : null}
      {props.layout === "pair" && props.pair ? (
        <RacePair {...props} pair={props.pair} width={width} height={height} />
      ) : (
        <SingleWindow {...props} width={width} height={height} />
      )}
      {props.footnote ? (
        <WindowFootnote frame={frame} text={props.footnote} exit={exit} />
      ) : null}
    </SceneShell>
  );
}

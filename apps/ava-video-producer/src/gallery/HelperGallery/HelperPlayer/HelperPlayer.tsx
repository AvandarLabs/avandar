import { Player } from "@remotion/player";
import { HelperComposition } from "./HelperComposition";
import type { Film } from "../../../showcase/showcase.types";

/**
 * The Remotion player sizes itself through inline styles, so the full-width
 * fill has to be passed the same way; a class is overridden.
 */
const PLAYER_STYLE = { width: "100%" } as const;

/** True when the viewer asked the system for less motion. */
function _isReducedMotionPreferred(): boolean {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

/**
 * The live player for a helper preview: a looping Remotion player with
 * frame controls, autoplaying unless the viewer prefers reduced motion.
 */
export function HelperPlayer({
  film,
}: {
  film: Extract<Film, { kind: "helper" }>;
}) {
  return (
    <div className="liveFilm">
      <Player
        style={PLAYER_STYLE}
        component={HelperComposition}
        inputProps={{ helperId: film.helper }}
        compositionWidth={film.width}
        compositionHeight={film.height}
        durationInFrames={film.frames}
        fps={film.fps}
        controls
        loop
        autoPlay={!_isReducedMotionPreferred()}
        clickToPlay={false}
        spaceKeyToPlayOrPause
        errorFallback={() => {
          return (
            <p className="liveError">
              Preview unavailable. Check the showcase terminal, then reload.
            </p>
          );
        }}
      />
    </div>
  );
}

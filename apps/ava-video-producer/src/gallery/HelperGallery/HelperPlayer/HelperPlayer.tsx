import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
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
    <I18nProvider i18n={i18n}>
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
          errorFallback={() => (
            <p className="liveError">
              <Trans>
                Preview unavailable. Check the showcase terminal, then reload.
              </Trans>
            </p>
          )}
        />
      </div>
    </I18nProvider>
  );
}

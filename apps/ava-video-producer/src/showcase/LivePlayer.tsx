import { i18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createRoot } from "react-dom/client";
import {
  continuityAppearanceSchema,
  createContinuityPlanFromOptions,
  type ContinuityAppearance,
} from "../continuity/continuityAppearance";
import { createContinuityPlanFromVideoThemeSnapshot } from "../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { HelperPlayer } from "../gallery/HelperGallery/HelperPlayer/HelperPlayer";
import { durationInFrames } from "../storyboard/schema/timeline";
import { VideoTokenUsageContext } from "../videoTheme/tokenUsage/tokenUsage";
import { useObservedTokenUsage } from "../videoThemeEditor/observedTokenUsage/useObservedTokenUsage";
import { FilmComposition } from "./FilmComposition";
import { useFilmControl } from "./useFilmControl/useFilmControl";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshot/videoThemeSnapshot";
import type { Film } from "./showcase.types";
import "../theme.css";
import "./player.css";

i18n.setMessagesCompiler(compileMessage);
i18n.loadAndActivate({ locale: "en", messages: {} });
const id = new URLSearchParams(location.search).get("id") ?? "avandar-home";

type SavedPlayback = Readonly<{
  frame: number;
  playing: boolean;
  captions: boolean;
  speed?: number;
  loop?: boolean;
}>;
type ContinuityShot = Extract<
  NonNullable<Film["plan"]>["shots"][number],
  { scene: "continuity" }
>;

function _readSaved(): SavedPlayback | undefined {
  try {
    return (
      (JSON.parse(
        sessionStorage.getItem(`film:${id}`) ?? "null",
      ) as SavedPlayback | null) ?? undefined
    );
  } catch {
    return undefined;
  }
}
const saved = _readSaved();
let savePlayback = () => {};
window.addEventListener("message", (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== window.parent ||
    event.data?.type !== "film-control" ||
    event.data.action !== "reload"
  ) {
    return;
  }
  try {
    savePlayback();
  } catch {
    /* Storage can be unavailable in a restricted browser. */
  }
  _send({ type: "film-reloading", requestId: event.data.requestId });
  location.reload();
});
function _send(message: object) {
  window.parent.postMessage(message, location.origin);
}

function _findContinuityShot(film: Film): ContinuityShot | undefined {
  const shot = film.plan?.shots.find(
    (candidate) => candidate.scene === "continuity",
  );
  return shot?.scene === "continuity" ? shot : undefined;
}

function _getInitialAppearance(
  shot: ContinuityShot | undefined,
): ContinuityAppearance {
  return continuityAppearanceSchema.parse(
    shot
      ? {
          cameraMotion: shot.props.cameraMotion,
          motionBlur: shot.props.motionBlur,
          annotations: shot.props.annotations,
        }
      : {},
  );
}

// The film keeps its unthemed plan: FilmComposition applies the theme.
function _createPreviewPlan(
  film: Film,
  appearance: ContinuityAppearance,
  isContinuity: boolean,
) {
  return film.plan && isContinuity
    ? createContinuityPlanFromOptions(film.plan, appearance)
    : film.plan;
}

function _getInitialFrame(previewFrames: number): number {
  const fallbackFrame =
    id === "avandar-home" ? 490 : Math.min(100, previewFrames - 1);
  return Math.min(previewFrames - 1, saved?.frame ?? fallbackFrame);
}

function useSavedPlayback(
  player: RefObject<PlayerRef | null>,
  state: Readonly<{ captions: boolean; speed: number; loop: boolean }>,
) {
  const { captions, speed, loop } = state;
  useEffect(
    function rememberPlaybackForReload() {
      savePlayback = () =>
        sessionStorage.setItem(
          `film:${id}`,
          JSON.stringify({
            frame: player.current?.getCurrentFrame() ?? 0,
            playing: player.current?.isPlaying() ?? false,
            captions,
            speed,
            loop,
          }),
        );
    },
    [player, captions, speed, loop],
  );
  useEffect(
    function registerPlayEventListener() {
      const current = player.current;
      const play = () => _send({ type: "film-playing", id });
      current?.addEventListener("play", play);
      return () => {
        current?.removeEventListener("play", play);
      };
    },
    [player],
  );
}

type LiveFilmProps = Readonly<{
  film: Film;
  player: RefObject<PlayerRef | null>;
  previewFrames: number;
  captions: boolean;
  speed: number;
  loop: boolean;
}>;

function LiveFilm(props: LiveFilmProps) {
  const { film, player, previewFrames, captions, speed, loop } = props;
  return (
    <Player
      ref={player}
      component={FilmComposition}
      inputProps={{
        film: { ...film, frames: previewFrames, showCaptions: captions },
      }}
      compositionWidth={film.width}
      compositionHeight={film.height}
      durationInFrames={previewFrames}
      fps={film.fps}
      controls
      loop={loop}
      playbackRate={speed}
      autoPlay={saved?.playing ?? false}
      initialFrame={_getInitialFrame(previewFrames)}
      style={{ width: "100%" }}
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
  );
}

/**
 * The live film's appearance, theme, and transport, seeded from the film and
 * the playback saved before a source reload.
 */
function useLiveFilmState(film: Film, continuity: ContinuityShot | undefined) {
  const [appearance, setAppearance] = useState(() =>
    _getInitialAppearance(continuity),
  );
  const [theme, setTheme] = useState<VideoThemeSnapshot | undefined>(
    film.theme,
  );
  const [captions, setCaptions] = useState(saved?.captions ?? true);
  const [speed, setSpeed] = useState(saved?.speed ?? 1);
  const [loop, setLoop] = useState(saved?.loop ?? false);
  return {
    appearance,
    setAppearance,
    theme,
    setTheme,
    captions,
    setCaptions,
    speed,
    setSpeed,
    loop,
    setLoop,
  };
}

/**
 * The embedded live preview: plays a film, follows the gallery's transport,
 * appearance, and theme messages, and reports the tokens its film reads.
 */
function LivePlayer({ film }: { film: Film }) {
  const player = useRef<PlayerRef>(null);
  const continuity = _findContinuityShot(film);
  const state = useLiveFilmState(film, continuity);
  const { appearance, theme, captions, speed, loop } = state;
  const usage = useObservedTokenUsage();
  const previewPlan = useMemo(
    () => _createPreviewPlan(film, appearance, Boolean(continuity)),
    [film, appearance, continuity],
  );
  // Count frames with the theme applied: its camera preset can lengthen beats.
  const previewFrames = useMemo(
    () =>
      previewPlan
        ? durationInFrames(
            createContinuityPlanFromVideoThemeSnapshot(previewPlan, theme, [
              film.id,
            ]),
          )
        : film.frames,
    [previewPlan, theme, film.id, film.frames],
  );
  useSavedPlayback(player, { captions, speed, loop });
  useFilmControl({
    id,
    player,
    isContinuity: Boolean(continuity),
    appearance,
    captions,
    speed,
    loop,
    previewFrames,
    usedTokens: usage.paths,
    send: _send,
    onAppearance: (nextAppearance) => {
      state.setAppearance(nextAppearance);
      state.setCaptions(nextAppearance.captions);
    },
    onTheme: state.setTheme,
    onSpeed: state.setSpeed,
    onLoop: state.setLoop,
  });
  return (
    <I18nProvider i18n={i18n}>
      <div className="liveFilm">
        <VideoTokenUsageContext.Provider value={usage.report}>
          <LiveFilm
            film={{ ...film, theme, plan: previewPlan }}
            player={player}
            previewFrames={previewFrames}
            captions={captions}
            speed={speed}
            loop={loop}
          />
        </VideoTokenUsageContext.Provider>
        {film.plan?.captions && !continuity ? (
          <label className="captionToggle">
            <input
              type="checkbox"
              checked={captions}
              onChange={(event) => state.setCaptions(event.target.checked)}
            />
            <Trans>Captions</Trans>
          </label>
        ) : null}
      </div>
    </I18nProvider>
  );
}

async function start() {
  const response = await fetch(`/api/films/${encodeURIComponent(id)}`);
  if (!response.ok) {
    throw new Error("Film unavailable");
  }
  const film = (await response.json()) as Film;
  createRoot(document.getElementById("root")!).render(
    film.kind === "helper" ? (
      <HelperPlayer film={film} />
    ) : (
      <LivePlayer film={film} />
    ),
  );
}
start().catch(() => {
  document.getElementById("load-error")!.hidden = false;
});

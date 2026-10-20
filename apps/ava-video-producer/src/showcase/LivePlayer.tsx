import { durationInFrames } from "../storyboard/schema/timeline";
import {
  continuityAppearanceSchema,
  createContinuityPlanFromOptions,
} from "../continuity/continuityAppearance";
import { i18n } from "@lingui/core";
import { compileMessage } from "@lingui/message-utils/compileMessage";
import { I18nProvider } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { FilmComposition } from "./FilmComposition";
import type { Film } from "./showcase.types";
import "../theme.css";
import "./player.css";

i18n.setMessagesCompiler(compileMessage);
i18n.loadAndActivate({ locale: "en", messages: {} });
const id = new URLSearchParams(location.search).get("id") ?? "avandar-home";
function readSaved() {
  try {
    return JSON.parse(sessionStorage.getItem(`film:${id}`) ?? "null") as {
      frame: number;
      playing: boolean;
      captions: boolean;
      speed?: number;
      loop?: boolean;
    } | null;
  } catch {
    return null;
  }
}
const saved = readSaved();
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
  send({ type: "film-reloading", requestId: event.data.requestId });
  location.reload();
});
function send(message: object) {
  window.parent.postMessage(message, location.origin);
}

function LivePlayer({ film }: { film: Film }) {
  const player = useRef<PlayerRef>(null);
  const continuity = film.plan?.shots.find(
    (shot) => shot.scene === "continuity",
  );
  const [appearance, setAppearance] = useState(() =>
    continuityAppearanceSchema.parse(
      continuity?.scene === "continuity"
        ? {
            accent: continuity.props.accent,
            background: continuity.props.background,
            cameraMotion: continuity.props.cameraMotion,
            motionBlur: continuity.props.motionBlur,
            annotations: continuity.props.annotations,
            annotationRoughness: continuity.props.annotationRoughness,
            boxRoughness: continuity.props.boxRoughness,
          }
        : {},
    ),
  );
  const previewPlan = film.plan && continuity
    ? createContinuityPlanFromOptions(film.plan, appearance)
    : film.plan;
  const previewFrames = previewPlan ? durationInFrames(previewPlan) : film.frames;
  const [captions, setCaptions] = useState(saved?.captions ?? true);
  const [speed, setSpeed] = useState(saved?.speed ?? 1);
  const [loop, setLoop] = useState(saved?.loop ?? false);
  useEffect(
    function restoreSavedPlaybackState() {
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
      send({
        type: "film-options",
        id,
        options: continuity ? { ...appearance, captions } : { captions },
        transport: { speed, loop },
      });
      const receive = (event: MessageEvent) => {
        if (
          event.origin !== location.origin ||
          event.source !== window.parent ||
          event.data?.type !== "film-control"
        ) {
          return;
        }
        if (event.data.id && event.data.id !== id) return;
        const { action, value } = event.data;
        if (action === "appearance" && continuity) {
          const result = continuityAppearanceSchema.safeParse(value);
          if (result.success) {
            setAppearance(result.data);
            setCaptions(result.data.captions);
          }
        }
        if (action === "options")
          send({
            type: "film-options",
            id,
            options: continuity ? { ...appearance, captions } : { captions },
            transport: { speed, loop },
          });
        if (action === "play") {
          player.current?.play();
        }
        if (action === "pause") {
          player.current?.pause();
        }
        if (action === "replay") {
          player.current?.seekTo(0);
          player.current?.play();
        }
        if (action === "seek" && Number.isFinite(value)) {
          player.current?.seekTo(Math.max(0, Math.min(previewFrames - 1, value)));
          player.current?.play();
        }
        if (action === "speed" && [0.5, 1, 1.5, 2].includes(value)) {
          setSpeed(value);
        }
        if (action === "loop") {
          setLoop(Boolean(value));
        }
      };
      window.addEventListener("message", receive);
      return () => window.removeEventListener("message", receive);
    },
    [previewFrames, captions, appearance, speed, loop, continuity],
  );
  useEffect(function registerPlayEventListener() {
    const current = player.current;
    const play = () => send({ type: "film-playing", id });
    current?.addEventListener("play", play);
    return () => {
      current?.removeEventListener("play", play);
    };
  }, []);
  return (
    <I18nProvider i18n={i18n}>
      <div className="liveFilm">
        <Player
          ref={player}
          component={FilmComposition}
          inputProps={{
            film: {
              ...film,
              plan: previewPlan,
              frames: previewFrames,
              showCaptions: captions,
            },
          }}
          compositionWidth={film.width}
          compositionHeight={film.height}
          durationInFrames={previewFrames}
          fps={film.fps}
          controls
          loop={loop}
          playbackRate={speed}
          autoPlay={saved?.playing ?? false}
          initialFrame={Math.min(
            previewFrames - 1,
            saved?.frame ??
              (id === "avandar-home" ? 490 : Math.min(100, previewFrames - 1)),
          )}
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
        {film.plan?.captions && !continuity ? (
          <label className="captionToggle">
            <input
              type="checkbox"
              checked={captions}
              onChange={(event) => setCaptions(event.target.checked)}
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
    <LivePlayer film={film} />,
  );
}
start().catch(() => {
  document.getElementById("load-error")!.hidden = false;
});

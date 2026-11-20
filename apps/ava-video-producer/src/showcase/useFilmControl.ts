import { useEffect, useRef, type RefObject } from "react";
import {
  continuityAppearanceSchema,
  type ContinuityAppearance,
} from "../continuity/continuityAppearance";
import {
  createFilmThemeAcknowledgement,
  createFilmTokensUsedMessage,
  createUnsupportedFilmThemeError,
  parseFilmControlMessage,
  type FilmControl,
} from "./filmThemeMessageHelpers/filmThemeMessageHelpers";
import type { VideoThemeSnapshot } from "../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import type { PlayerRef } from "@remotion/player";

const PLAYBACK_SPEEDS: readonly number[] = [0.5, 1, 1.5, 2];

/**
 * Posts a film status or acknowledgement message to the same-origin parent
 * gallery.
 */
export function postToParentGallery(message: object): void {
  window.parent.postMessage(message, location.origin);
}

/** The live player's state and setters that parent messages read and change. */
export type FilmControlOptions = Readonly<{
  id: string;
  player: RefObject<PlayerRef | null>;
  isContinuity: boolean;
  appearance: ContinuityAppearance;
  captions: boolean;
  speed: number;
  loop: boolean;
  previewFrames: number;
  usedTokens: readonly string[];
  onAppearance: (appearance: ContinuityAppearance) => void;
  onTheme: (snapshot: VideoThemeSnapshot) => void;
  onSpeed: (speed: number) => void;
  onLoop: (loop: boolean) => void;
}>;

function _sendOptions(options: FilmControlOptions): void {
  postToParentGallery({
    type: "film-options",
    id: options.id,
    options: options.isContinuity
      ? { ...options.appearance, captions: options.captions }
      : { captions: options.captions },
    transport: { speed: options.speed, loop: options.loop },
  });
}

function _seek(value: unknown, options: FilmControlOptions): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return;
  }
  const player = options.player.current;
  player?.seekTo(Math.max(0, Math.min(options.previewFrames - 1, value)));
  player?.play();
}

function _handlePlayback(
  { action, value }: FilmControl,
  options: FilmControlOptions,
): boolean {
  const player = options.player.current;
  switch (action) {
    case "play":
      player?.play();
      return true;
    case "pause":
      player?.pause();
      return true;
    case "replay":
      player?.seekTo(0);
      player?.play();
      return true;
    case "seek":
      _seek(value, options);
      return true;
    case "speed":
      if (typeof value === "number" && PLAYBACK_SPEEDS.includes(value)) {
        options.onSpeed(value);
      }
      return true;
    case "loop":
      options.onLoop(Boolean(value));
      return true;
    default:
      return false;
  }
}

function _applyTheme(
  { value, requestKey }: FilmControl,
  options: FilmControlOptions,
): void {
  if (!options.isContinuity) {
    postToParentGallery(
      createUnsupportedFilmThemeError(options.id, requestKey),
    );
    return;
  }
  const { snapshot, message } = createFilmThemeAcknowledgement({
    id: options.id,
    value,
    requestKey,
  });
  if (snapshot) {
    options.onTheme(snapshot);
  }
  postToParentGallery(message);
}

/**
 * Posts the film's token usage within the gallery's limits, only when the
 * bounded list differs from the last one sent.
 */
function useUsedTokensReport(id: string, usedTokens: readonly string[]): void {
  const lastSentPaths = useRef<string[]>([]);
  useEffect(
    function reportUsedTokens() {
      const message = createFilmTokensUsedMessage(id, usedTokens);
      if (
        message.paths.length === 0 ||
        (message.paths.length === lastSentPaths.current.length &&
          message.paths.every((path, index) => {
            return path === lastSentPaths.current[index];
          }))
      ) {
        return;
      }
      lastSentPaths.current = message.paths;
      postToParentGallery(message);
    },
    [usedTokens, id],
  );
}

function _handleSettings(
  control: FilmControl,
  options: FilmControlOptions,
): void {
  const { action, value } = control;
  if (action === "appearance" && options.isContinuity) {
    const result = continuityAppearanceSchema.safeParse(value);
    if (result.success) {
      options.onAppearance(result.data);
    }
  }
  if (action === "theme") {
    _applyTheme(control, options);
  }
  if (action === "options") {
    _sendOptions(options);
  }
}

/**
 * Connects the live player to the gallery that embeds it: answers transport,
 * appearance, and theme messages, acknowledges a theme by its resolved
 * hash, reports its options whenever they change, and posts the tokens its
 * film has read.
 */
export function useFilmControl(options: FilmControlOptions): void {
  const latestOptions = useRef(options);
  useEffect(() => {
    latestOptions.current = options;
  });
  const { isContinuity, appearance, captions, speed, loop } = options;
  const { usedTokens, id } = options;
  useEffect(
    function reportOptions() {
      _sendOptions(latestOptions.current);
    },
    [isContinuity, appearance, captions, speed, loop],
  );
  useEffect(function listenForFilmControls() {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== location.origin || event.source !== window.parent) {
        return;
      }
      const control = parseFilmControlMessage(
        event.data,
        latestOptions.current.id,
      );
      if (control && !_handlePlayback(control, latestOptions.current)) {
        _handleSettings(control, latestOptions.current);
      }
    };
    window.addEventListener("message", receive);
    return () => {
      return window.removeEventListener("message", receive);
    };
  }, []);
  useUsedTokensReport(id, usedTokens);
}
